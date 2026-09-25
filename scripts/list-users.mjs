#!/usr/bin/env node
// Lists every Firebase Authentication account in this project, with whether
// each one already has the "admin" custom claim. Use this before running
// set-admin-claim.mjs, so you know exactly who exists and who still needs
// (or shouldn't have) the claim — never printed here are passwords or tokens.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json" node scripts/list-users.mjs

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'node:fs'

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON path first.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
let nextPageToken
let total = 0
do {
  const page = await auth.listUsers(1000, nextPageToken)
  for (const u of page.users) {
    const isAdmin = u.customClaims?.admin === true
    console.log(`${isAdmin ? '[admin]' : '[     ]'} ${u.email || '(no email)'}  uid=${u.uid}  created=${u.metadata.creationTime}`)
    total++
  }
  nextPageToken = page.pageToken
} while (nextPageToken)
console.log(`\nTotal: ${total} account(s).`)
