const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

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

exports.submitQuote = onCall({ enforceAppCheck: true, cors: true }, async (request) => {
  const data = request.data && typeof request.data === 'object' ? request.data : {}

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
  // never read or write it directly; only the Admin SDK here can).
  const ip = request.rawRequest?.ip || 'unknown'
  const rateRef = db.collection('rateLimits').doc(ip)
  const now = Date.now()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef)
    const prev = snap.exists ? snap.data() : null
    const windowStart = prev && now - prev.windowStart < RATE_LIMIT_WINDOW_MS ? prev.windowStart : now
    const count = windowStart === (prev?.windowStart ?? null) ? (prev.count || 0) + 1 : 1
    if (count > RATE_LIMIT_MAX) {
      throw new HttpsError('resource-exhausted', 'Demasiadas solicitudes. Intenta de nuevo más tarde.')
    }
    tx.set(rateRef, { count, windowStart, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userAgent: request.rawRequest?.headers?.['user-agent'] || '',
  }

  const ref = await db.collection('quotes').add(doc)
  return { ok: true, id: ref.id }
})
