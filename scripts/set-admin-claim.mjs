#!/usr/bin/env node
// Grants (or revokes) the "admin" custom claim on a Firebase Authentication
// account. firestore.rules only treats an account as staff when this claim
// is present — being signed in on its own is no longer enough.
//
// Setup (one time):
//   1. Firebase Console → Project settings → Service accounts →
//      "Generate new private key". Save the JSON file OUTSIDE this repo
//      (e.g. your Desktop or Downloads), NEVER inside gutierrez-services —
//      .gitignore blocks common names but don't rely on that.
//   2. npm install firebase-admin   (one-time, adds it to node_modules)
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json" node scripts/set-admin-claim.mjs staff@example.com
//   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json" node scripts/set-admin-claim.mjs staff@example.com --revoke
//
// After running, that account must sign out and back in (or wait up to ~1h
// for its Firebase ID token to refresh) before the new claim takes effect
// in the app / in firestore.rules.

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'node:fs'

const email = process.argv[2]
const revoke = process.argv.includes('--revoke')

if (!email || email.startsWith('--')) {
  console.error('Usage: node scripts/set-admin-claim.mjs <email> [--revoke]')
  process.exit(1)
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON path first.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const user = await auth.getUserByEmail(email)
await auth.setCustomUserClaims(user.uid, revoke ? {} : { admin: true })

console.log(revoke
  ? `Revoked admin from ${email} (uid: ${user.uid}).`
  : `Granted admin to ${email} (uid: ${user.uid}).`)
console.log('They must sign out and back in (or wait ~1h) for the change to take effect.')
