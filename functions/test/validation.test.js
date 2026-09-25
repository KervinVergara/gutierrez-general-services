// Unit tests for the pure validation helpers in index.js — no Firestore,
// Auth, or App Check involved, so these run with plain `node --test`
// (Node 22's built-in test runner) and no extra dependencies.
//
// Covers the ChatGPT-review items that don't need a live emulator: oversized
// payload, honeypot, unexpected extra field, and the CORS origin allowlist
// itself. Rate-limit concurrency, App-Check-absent and Secret Manager
// failure need a running Functions emulator with App Check debug tokens —
// not covered here; see the project notes for that trade-off.

const test = require('node:test')
const assert = require('node:assert/strict')
const { isPayloadTooLarge, isHoneypotFilled, validateQuoteData, ALLOWED_ORIGINS, ALLOWED_FIELDS } = require('../index.js')._testables

function validQuote(overrides = {}) {
  return { name: 'Jane Doe', phone: '5745551234', lang: 'en', ...overrides }
}

test('accepts a well-formed quote', () => {
  assert.equal(validateQuoteData(validQuote()).ok, true)
})

test('rejects a payload over 20KB', () => {
  const huge = { name: 'a'.repeat(25000), phone: '5745551234', lang: 'en' }
  assert.equal(isPayloadTooLarge(huge), true)
})

test('accepts a payload under the size cap', () => {
  assert.equal(isPayloadTooLarge(validQuote()), false)
})

test('detects a filled honeypot field', () => {
  assert.equal(isHoneypotFilled({ website: 'http://spam.example' }), true)
  assert.equal(isHoneypotFilled({ website: '' }), false)
  assert.equal(isHoneypotFilled({}), false)
})

test('rejects an unexpected extra field (mass-assignment guard)', () => {
  const withExtra = validQuote({ isAdmin: true })
  assert.equal(validateQuoteData(withExtra).ok, false)
})

test('rejects a missing/blank required field', () => {
  assert.equal(validateQuoteData(validQuote({ name: '' })).ok, false)
  assert.equal(validateQuoteData({ phone: '5745551234', lang: 'en' }).ok, false)
})

test('rejects a phone that is too short to be real', () => {
  assert.equal(validateQuoteData(validQuote({ phone: '123' })).ok, false)
})

test('rejects an unsupported lang value', () => {
  assert.equal(validateQuoteData(validQuote({ lang: 'fr' })).ok, false)
})

test('rejects an invalid type value', () => {
  assert.equal(validateQuoteData(validQuote({ type: 'boat' })).ok, false)
})

test('CORS allowlist only contains the real production/staging origins', () => {
  assert.deepEqual(ALLOWED_ORIGINS, [
    'https://gutierrezgeneralservices.com',
    'https://www.gutierrezgeneralservices.com',
    'https://gutierrez-generalservices.web.app',
    'https://gutierrez-generalservices.firebaseapp.com',
  ])
  assert.equal(ALLOWED_ORIGINS.includes('https://evil.example'), false)
})

test('ALLOWED_FIELDS does not include anything server-controlled (status, createdAt, userAgent, etc.)', () => {
  for (const serverField of ['status', 'createdAt', 'userAgent', 'website']) {
    assert.equal(ALLOWED_FIELDS.has(serverField), false)
  }
})
