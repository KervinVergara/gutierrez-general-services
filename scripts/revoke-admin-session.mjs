#!/usr/bin/env node
// EMERGENCY: revoca por completo el acceso de una cuenta al panel /admin.
// Úsalo si sospechas que la contraseña de una cuenta admin fue comprometida
// (phishing, contraseña reusada filtrada en otro sitio, dispositivo perdido, etc.)
//
// Hace las 3 cosas que importan, en el orden correcto:
//   1. Quita el custom claim "admin" (firestore.rules deja de tratarla como staff).
//   2. Deshabilita la cuenta en Firebase Authentication (no puede volver a
//      iniciar sesión, ni siquiera con la contraseña correcta).
//   3. Revoca los refresh tokens (invalida su sesión actual — la próxima vez
//      que el cliente intente renovar su ID token, la renovación falla y el
//      SDK de Firebase la cierra sesión automáticamente).
//
// Nota importante: un ID token ya emitido sigue siendo técnicamente válido
// hasta que expira (máx. 1 hora) o hasta que el cliente intenta renovarlo.
// Admin.jsx ya fuerza una renovación del token cada vez que la pestaña
// recupera el foco — así que en la práctica la sesión se corta en el
// siguiente refocus/renovación, no instantáneamente. Si necesitas invalidar
// YA MISMO una sesión activa en pantalla, además de correr este script pide
// que cierren esa pestaña/navegador.
//
// Setup (una sola vez): igual que set-admin-claim.mjs — variable de entorno
// GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la cuenta de servicio.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json" node scripts/revoke-admin-session.mjs staff@example.com
//
// Para restaurar el acceso después (cuenta limpia, contraseña nueva):
//   1. Habilitar la cuenta de nuevo en Firebase Console → Authentication.
//   2. node scripts/set-password.mjs <email> <nueva-contraseña>
//   3. node scripts/set-admin-claim.mjs <email>

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'node:fs'

const email = process.argv[2]

if (!email) {
  console.error('Uso: node scripts/revoke-admin-session.mjs <email>')
  process.exit(1)
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('Define GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la cuenta de servicio primero.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const user = await auth.getUserByEmail(email)

await auth.setCustomUserClaims(user.uid, {})
await auth.updateUser(user.uid, { disabled: true })
await auth.revokeRefreshTokens(user.uid)

console.log(`Acceso revocado para ${email} (uid: ${user.uid}):`)
console.log('  - claim "admin" removido')
console.log('  - cuenta deshabilitada (no puede volver a iniciar sesión)')
console.log('  - refresh tokens revocados (su sesión activa se corta en el próximo refocus/renovación)')
