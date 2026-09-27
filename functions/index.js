const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const crypto = require('node:crypto')

initializeApp()
const db = getFirestore()

// Every function below runs as this dedicated service account instead of the
// project's default Compute Engine service account (which historically carries
// the broad, project-wide Editor role). The Admin SDK used throughout this file
// bypasses firestore.rules entirely, so this runtime identity — not the rules —
// is the real security boundary for what these functions can touch. It only has
// Cloud Datastore User (Firestore read/write) + Eventarc Event Receiver (needed
// for the audit triggers) + Secret Manager access scoped to RATE_LIMIT_IP_SALT
// alone (granted directly on that secret, not project-wide).
const RUNTIME_SERVICE_ACCOUNT = 'functions-runtime@gutierrez-generalservices.iam.gserviceaccount.com'

setGlobalOptions({ region: 'us-central1', maxInstances: 10, serviceAccount: RUNTIME_SERVICE_ACCOUNT }) // redeploy: IAM role fix 2026-09-25

// Salt for hashing IPs before they're stored in rateLimits (see below).
// Set once via: firebase functions:secrets:set RATE_LIMIT_IP_SALT
const RATE_LIMIT_IP_SALT = defineSecret('RATE_LIMIT_IP_SALT')

// Resend API key for the new-quote email notification (see notifyQuote).
// Set once via: firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

// Explicit origin allowlist for the callable functions' CORS handling.
// Defense in depth on top of App Check — CORS alone isn't a security
// boundary (a non-browser caller ignores it entirely), but there's no
// reason to echo Access-Control-Allow-Origin for arbitrary origins either.
const ALLOWED_ORIGINS = [
  'https://gutierrezgeneralservices.com',
  'https://www.gutierrezgeneralservices.com',
  'https://gutierrez-generalservices.web.app',
  'https://gutierrez-generalservices.firebaseapp.com',
]

// Same allowed fields the public quote path used to accept directly in
// firestore.rules, plus the "website" honeypot (never stored). status/
// createdAt/userAgent are set here, server-side, never trusted from the
// client — mirrors what firestore.rules previously enforced, now enforced
// in code before anything touches Firestore.
const ALLOWED_FIELDS = new Set(['type', 'name', 'phone', 'email', 'zip', 'service', 'vehicle', 'message', 'lang'])
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour per IP
const MAX_PAYLOAD_CHARS = 20000

// --- Pure helpers (exported below for unit tests — no Firestore/Admin SDK
// involved, so these can be tested without an emulator). ------------------

function isNonEmptyString(value, maxLen) {
  return typeof value === 'string' && value.trim().length > 0 && value.length < maxLen
}

function isOptionalString(value, maxLen) {
  return value === undefined || value === '' || (typeof value === 'string' && value.length < maxLen)
}

function isPayloadTooLarge(data) {
  return JSON.stringify(data).length > MAX_PAYLOAD_CHARS
}

function isHoneypotFilled(data) {
  return typeof data.website === 'string' && data.website.trim() !== ''
}

// Validates the quote fields (allowlist + per-field checks). Returns
// { ok: true } or { ok: false }. Doesn't touch Firestore — used by
// submitQuote and covered directly by unit tests.
function validateQuoteData(data) {
  const keys = Object.keys(data).filter((k) => k !== 'website')
  if (!keys.every((k) => ALLOWED_FIELDS.has(k))) return { ok: false }
  if (!isNonEmptyString(data.name, 120)) return { ok: false }
  if (!isNonEmptyString(data.phone, 40) || data.phone.trim().length <= 5) return { ok: false }
  if (!isOptionalString(data.email, 200)) return { ok: false }
  if (!isOptionalString(data.zip, 20)) return { ok: false }
  if (!isOptionalString(data.service, 120)) return { ok: false }
  if (!isOptionalString(data.vehicle, 200)) return { ok: false }
  if (!isOptionalString(data.message, 2000)) return { ok: false }
  if (data.type !== undefined && data.type !== '' && !['vehicle', 'home', 'both'].includes(data.type)) return { ok: false }
  if (!['en', 'es'].includes(data.lang)) return { ok: false }
  return { ok: true }
}

// Generic, non-leaky error for every rejection — never tells a caller which
// specific check failed, so a bot/attacker can't use error messages to
// probe the validation rules field by field.
function reject() {
  throw new HttpsError('invalid-argument', 'No se pudo procesar la solicitud. Verifica los datos e intenta de nuevo.')
}

exports.submitQuote = onCall(
  { enforceAppCheck: true, cors: ALLOWED_ORIGINS, secrets: [RATE_LIMIT_IP_SALT], memory: '256MiB', timeoutSeconds: 20, concurrency: 40 },
  async (request) => {
    const data = request.data && typeof request.data === 'object' ? request.data : {}

    // Cheap early reject for an oversized payload, before doing anything
    // else with it (field-by-field limits below cap it further to ~2.7KB
    // of actual content; this just avoids extra work on obvious garbage).
    if (isPayloadTooLarge(data)) reject()

    // Honeypot: a hidden field real visitors never see or fill. A bot that
    // fills it gets a fake success (so it doesn't learn it was caught), but
    // nothing is written to Firestore.
    if (isHoneypotFilled(data)) {
      return { ok: true }
    }

    if (!validateQuoteData(data).ok) reject()

    // Per-IP rate limit — a simple sliding-window counter in its own
    // server-only collection (not listed in firestore.rules, so clients can
    // never read or write it directly; only the Admin SDK here can). The IP
    // is never stored raw — only a salted hash, so the collection alone
    // can't be used to reconstruct visitor IPs. expiresAt backs a Firestore
    // TTL policy (configured once in the console) that auto-deletes stale
    // counters instead of letting the collection grow forever.
    //
    // request.rawRequest.ip is Express's already-parsed client IP, not a
    // raw header we read ourselves — we never trust req.headers['x-forwarded-for']
    // directly (that would let a caller forge their own IP and dodge the
    // limit). Cloud Functions v2 runs behind Google Front End, which is the
    // trusted proxy that sets X-Forwarded-For and strips/ignores any value
    // a client tried to set on the way in; Express derives req.ip from that
    // trusted chain. There's no client-reachable way to override it.
    const ip = request.rawRequest?.ip || 'unknown'
    const ipHash = crypto.createHmac('sha256', RATE_LIMIT_IP_SALT.value()).update(ip).digest('hex')
    const rateRef = db.collection('rateLimits').doc(ipHash)
    const now = Date.now()
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(rateRef)
      const prev = snap.exists ? snap.data() : null
      const windowStart = prev && now - prev.windowStart < RATE_LIMIT_WINDOW_MS ? prev.windowStart : now
      const count = windowStart === (prev?.windowStart ?? null) ? (prev.count || 0) + 1 : 1
      if (count > RATE_LIMIT_MAX) {
        throw new HttpsError('resource-exhausted', 'Demasiadas solicitudes. Intenta de nuevo más tarde.')
      }
      tx.set(rateRef, {
        count,
        windowStart,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + RATE_LIMIT_WINDOW_MS * 2),
      })
    })

    const doc = {
      type: data.type || '',
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim() : '',
      zip: data.zip || '',
      service: data.service || '',
      vehicle: data.vehicle || '',
      message: data.message || '',
      lang: data.lang,
      status: 'new',
      createdAt: FieldValue.serverTimestamp(),
      userAgent: request.rawRequest?.headers?.['user-agent'] || '',
    }

    const ref = await db.collection('quotes').add(doc)
    return { ok: true, id: ref.id }
  }
)

// --- Staff-only deletes for the audited CRM collections -------------------
// firestore.rules denies `delete` on clients/jobs/finance/plans entirely —
// the only way to remove a record is through this callable, which checks
// the admin custom claim itself (defense in depth on top of App Check),
// deletes via the Admin SDK, and writes the /auditLog entry itself with the
// REAL uid of whoever deleted it. This closes the gap the audit trigger
// below always had for deletes (a background Firestore trigger has no way
// to know who caused it — only the last known updatedBy on the document).
// Because deletes are now only ever logged here, the trigger below skips
// delete events entirely to avoid a second, less-accurate log entry.
const DELETABLE_COLLECTIONS = new Set(['clients', 'jobs', 'finance', 'plans'])
const AUDIT_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000 // 2 years

exports.deleteRecord = onCall(
  { enforceAppCheck: true, cors: ALLOWED_ORIGINS, memory: '256MiB', timeoutSeconds: 20, concurrency: 40 },
  async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
      throw new HttpsError('permission-denied', 'No tienes permiso para esta acción.')
    }
    const { collection, id } = request.data || {}
    if (typeof collection !== 'string' || !DELETABLE_COLLECTIONS.has(collection) || typeof id !== 'string' || !id) {
      throw new HttpsError('invalid-argument', 'Solicitud inválida.')
    }

    const ref = db.collection(collection).doc(id)
    const snap = await ref.get()
    if (!snap.exists) return { ok: true } // already gone — makes a retried call a no-op, not a duplicate log entry

    const before = snap.data()
    await ref.delete()
    await db.collection('auditLog').add({
      collection,
      docId: id,
      op: 'delete',
      actor: request.auth.uid,
      actorEmail: request.auth.token.email || before?.updatedByEmail || null,
      before,
      after: null,
      at: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + AUDIT_RETENTION_MS),
    })
    return { ok: true }
  }
)

// --- Audit trail for the internal CRM collections -------------------------
// firestore.rules requires every create/update on these four collections to
// carry `updatedBy` (the writer's own uid — they can't claim to be someone
// else). This trigger fires on every create/update and copies a
// before/after record into /auditLog, which only staff can read and only
// Cloud Functions (via the Admin SDK) can write — so even a compromised
// admin session can't quietly edit history without leaving a trace, and
// can't edit or delete the trail itself.
//
// Deletes are NOT logged here — see deleteRecord above, which is the only
// way clients/jobs/finance/plans can be deleted (firestore.rules denies
// `delete` outright) and logs them itself with the real deleter's uid.
//
// Idempotent: Firestore triggers are "at least once" delivery, so the same
// write can be redelivered. Using the CloudEvent's own event.id as the
// /auditLog document ID makes a redelivery overwrite the same document with
// the same content instead of creating a duplicate.
//
// Retention: entries carry expiresAt (2 years out) backing a Firestore TTL
// policy on auditLog (configured once in the console, same as rateLimits),
// so old audit history — which can include client contact details — isn't
// kept forever once it's no longer operationally useful.
const AUDITED_COLLECTIONS = ['clients', 'jobs', 'finance', 'plans']

for (const col of AUDITED_COLLECTIONS) {
  exports[`audit_${col}`] = onDocumentWritten(
    { document: `${col}/{docId}`, memory: '256MiB', timeoutSeconds: 30, maxInstances: 5 },
    async (event) => {
      const before = event.data.before.exists ? event.data.before.data() : null
      const after = event.data.after.exists ? event.data.after.data() : null
      if (!after) return // delete — handled by deleteRecord instead, skip to avoid a duplicate/less-accurate entry

      const op = !before ? 'create' : 'update'
      await db.collection('auditLog').doc(event.id).set({
        collection: col,
        docId: event.params.docId,
        op,
        actor: after?.updatedBy || null,
        actorEmail: after?.updatedByEmail || null,
        before,
        after,
        at: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + AUDIT_RETENTION_MS),
      })
    }
  )
}

// --- New-quote email notification -----------------------------------------
// Fires once per new document in /quotes (the only writer is submitQuote
// above) and emails the business inbox so nobody has to watch the panel.
// Delivery is "at least once", so a redelivery can send a duplicate email —
// acceptable for a notification; the quote itself is never duplicated.
// Outbound mail goes through Resend's HTTP API (no SDK; Node 22 fetch).
// A failure here is logged and swallowed: the quote is already saved and
// visible in /admin, an email hiccup must never turn into a retry storm.
const NOTIFY_FROM = 'Gutierrez General Services <contact@gutierrezgeneralservices.com>'
const NOTIFY_TO = ['contact@gutierrezgeneralservices.com']
const ADMIN_URL = 'https://gutierrezgeneralservices.com/admin'

const TYPE_LABELS = { vehicle: 'Vehicle', home: 'Home / property', both: 'Vehicle + home' }

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

function buildQuoteEmail(id, q) {
  const rows = [
    ['Name', q.name],
    ['Phone', q.phone],
    ['Email', q.email || '—'],
    ['ZIP / Address', q.zip || '—'],
    ['Type', TYPE_LABELS[q.type] || q.type || '—'],
    ['Service', q.service || '—'],
    ['Vehicle / equipment', q.vehicle || '—'],
    ['Details', q.message || '—'],
    ['Language', q.lang === 'es' ? 'Spanish' : 'English'],
  ]
  const phoneDigits = String(q.phone || '').replace(/[^\d+]/g, '')
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nOpen in panel: ${ADMIN_URL}\nQuote ID: ${id}`
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1b2a41;line-height:1.5">
  <h2 style="margin:0 0 12px">New quote request</h2>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
  ${rows.map(([k, v]) => `<tr><td style="color:#5b6b7f;vertical-align:top;white-space:nowrap"><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}
  </table>
  <p style="margin:18px 0 6px">
    <a href="tel:${escapeHtml(phoneDigits)}" style="display:inline-block;background:#1b2a41;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;margin-right:8px">Call ${escapeHtml(q.phone)}</a>
    <a href="${ADMIN_URL}" style="display:inline-block;background:#f2b705;color:#1b2a41;text-decoration:none;padding:10px 16px;border-radius:999px">Open in panel</a>
  </p>
  <p style="color:#8a97a6;font-size:12px">Quote ID ${escapeHtml(id)} · sent automatically from gutierrezgeneralservices.com</p>
  </body></html>`
  return { text, html }
}

exports.notifyQuote = onDocumentCreated(
  { document: 'quotes/{quoteId}', secrets: [RESEND_API_KEY], memory: '256MiB', timeoutSeconds: 30, maxInstances: 5, retry: false },
  async (event) => {
    const q = event.data?.data()
    if (!q) return
    const id = event.params.quoteId
    const subject = `New quote: ${q.name} — ${q.service || TYPE_LABELS[q.type] || 'request'}`
    const { text, html } = buildQuoteEmail(id, q)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: NOTIFY_FROM,
          to: NOTIFY_TO,
          reply_to: q.email || undefined,
          subject,
          text,
          html,
          headers: { 'X-Entity-Ref-ID': id }, // Resend de-dupes on this if the trigger is redelivered
        }),
      })
      if (!res.ok) console.error('notifyQuote: Resend responded', res.status, await res.text())
    } catch (err) {
      console.error('notifyQuote: failed to send', err)
    }
  }
)

// Exported only for unit tests (functions/test/) — never used by the
// deployed function logic above, which calls the same helpers directly.
exports._testables = { isNonEmptyString, isOptionalString, isPayloadTooLarge, isHoneypotFilled, validateQuoteData, ALLOWED_ORIGINS, ALLOWED_FIELDS }
