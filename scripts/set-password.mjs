#!/usr/bin/env node
// Resets the Firebase Authentication password for one account directly via
// the Admin SDK — no password-reset email needed. Prompts interactively so
// the new password isn't left sitting in your shell history as a CLI arg.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json" node scripts/set-password.mjs correo@ejemplo.com

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'node:fs'
import readline from 'node:readline'

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/set-password.mjs <email>')
  process.exit(1)
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON path first.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const newPassword = await new Promise((resolve) => rl.question('Nueva contraseña (mínimo 6 caracteres, se ve mientras la escribes): ', resolve))
rl.close()

if (newPassword.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres.')
  process.exit(1)
}

const auth = getAuth()
const user = await auth.getUserByEmail(email)
await auth.updateUser(user.uid, { password: newPassword })
console.log(`Contraseña actualizada para ${email}. Ya puedes iniciar sesión con la nueva.`)
