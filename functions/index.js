const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const crypto = require('node:crypto')

initializeApp()
const db = getFirestore()

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

// Salt for hashing IPs before they're stored in rateLimits (see below).
// Set once via: firebase functions:secrets:set RATE_LIMIT_IP_SALT
const RATE_LIMIT_IP_SALT = defineSecret('RATE_LIMIT_IP_SALT')

// Explicit origin allowlist for the callable function's CORS handling.
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

function isNonEmptyString(value, maxLen) {
  return typeof value === 'string' && value.trim().length > 0 && value.length < maxLen
}

function isOptionalString(value, maxLen) {
  return value === undefined || value === '' || (typeof value === 'string' && value.length < maxLen)
}

// Generic, non-leaky error for every rejection — never tells a caller which
// specific check failed, so a bot/attacker can't use error messages to
// probe the validation rules field by field.
function reject() {
  throw new HttpsError('invalid-argument', 'No se pudo procesar la solicitud. Verifica los datos e intenta de nuevo.')
}

exports.submitQuote = onCall({ enforceAppCheck: true, cors: ALLOWED_ORIGINS, secrets: [RATE_LIMIT_IP_SALT] }, async (request) => {
  const data = request.data && typeof request.data === 'object' ? request.data : {}

  // Cheap early reject for an oversized payload, before doing anything
  // else with it (field-by-field limits below cap it further to ~2.7KB
  // of actual content; this just avoids extra work on obvious garbage).
  if (JSON.stringify(data).length > 20000) reject()

  // Honeypot: a hidden field real visitors never see or fill. A bot that
  // fills it gets a fake success (so it doesn't learn it was caught), but
  // nothing is written to Firestore.
  if (typeof data.website === 'string' && data.website.trim() !== '') {
    return { ok: true }
  }

  const keys = Object.keys(data).filter((k) => k !== 'website')
  if (!keys.every((k) => ALLOWED_FIELDS.has(k))) reject()

  if (!isNonEmptyString(data.name, 120)) reject()
  if (!isNonEmptyString(data.phone, 40) || data.phone.trim().length <= 5) reject()
  if (!isOptionalString(data.email, 200)) reject()
  if (!isOptionalString(data.zip, 20)) reject()
  if (!isOptionalString(data.service, 120)) reject()
  if (!isOptionalString(data.vehicle, 200)) reject()
  if (!isOptionalString(data.message, 2000)) reject()
  if (data.type !== undefined && data.type !== '' && !['vehicle', 'home', 'both'].includes(data.type)) reject()
  if (!['en', 'es'].includes(data.lang)) reject()

  // Per-IP rate limit — a simple sliding-window counter in its own
  // server-only collection (not listed in firestore.rules, so clients can
  // never read or write it directly; only the Admin SDK here can). The IP
  // is never stored raw — only a salted hash, so the collection alone
  // can't be used to reconstruct visitor IPs. expiresAt backs a Firestore
  // TTL policy (configured once in the console) that auto-deletes stale
  // counters instead of letting the collection grow forever.
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
})


// --- Audit trail for the internal CRM collections -------------------------
// firestore.rules requires every create/update on these four collections to
// carry `updatedBy` (the writer's own uid — they can't claim to be someone
// else). This trigger fires on every create/update/delete and copies a
// before/after record into /auditLog, which only staff can read and only
// this trigger (via the Admin SDK) can write — so even a compromised admin
// session can't quietly edit history without leaving a trace, and can't
// edit or delete the trail itself.
//
// Known limitation: a delete has no new document to read an actor from, so
// its `actor` field falls back to whoever last updated the document before
// it was deleted, not necessarily who deleted it. Firestore doesn't hand
// background triggers the identity of the request that caused them, so
// capturing the true deleter would require moving deletes through a
// callable function instead of direct client SDK calls — not done here to
// avoid changing how the panel deletes things.
const AUDITED_COLLECTIONS = ['clients', 'jobs', 'finance', 'plans']

for (const col of AUDITED_COLLECTIONS) {
  exports[`audit_${col}`] = onDocumentWritten(`${col}/{docId}`, async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null
    const after = event.data.after.exists ? event.data.after.data() : null
    const op = !before ? 'create' : !after ? 'delete' : 'update'
    await db.collection('auditLog').add({
      collection: col,
      docId: event.params.docId,
      op,
      actor: after?.updatedBy || before?.updatedBy || null,
      actorEmail: after?.updatedByEmail || before?.updatedByEmail || null,
      before,
      after,
      at: FieldValue.serverTimestamp(),
    })
  })
}
