# Gutierrez General Services LLC — sitio web + panel

Landing bilingüe (EN/ES) con formulario de cotización guardado en Firestore, y panel interno en `/admin`.

## Desarrollo
```
npm install
cp .env.example .env   # llenar con las credenciales del proyecto Firebase
npm run dev
```

## Configurar Firebase (una sola vez)
1. Firebase Console → crear proyecto (p. ej. `gutierrez-general-services`).
2. Agregar app Web → copiar la config a `.env` (variables `VITE_FIREBASE_*`).
3. Build → Firestore Database → crear (modo producción).
4. Build → Authentication → habilitar *Email/Password* y crear el usuario del cliente.
5. `npm i -g firebase-tools`, `firebase login`, `firebase use --add` (elegir el proyecto).
6. `firebase deploy --only firestore:rules`

## Control de acceso del panel (admin custom claim)

`firestore.rules` ya NO trata "sesión iniciada" como sinónimo de "es del
staff" — exige el custom claim `admin: true` en el token de Firebase Auth.
Sin este claim, una cuenta autenticada no puede leer ni escribir `quotes`,
`clients`, `jobs`, `finance` ni `plans`, igual que un visitante anónimo.

Antes de desplegar `firestore.rules` a producción la primera vez con este
cambio, hay que asignarle el claim a cada cuenta de staff — si no, se
bloquean a sí mismos del panel.

1. Firebase Console → ⚙️ Configuración del proyecto → Cuentas de servicio →
   *Generar nueva clave privada*. Guarda el JSON **fuera** de esta carpeta
   (nunca dentro de `gutierrez-services`).
2. `npm install` (agrega `firebase-admin`, usado solo por estos scripts, nunca
   por el sitio en sí).
3. Ver quién existe hoy:
   ```
   GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\a\la\clave.json" node scripts/list-users.mjs
   ```
4. Dar el claim a cada cuenta de staff real:
   ```
   GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\a\la\clave.json" node scripts/set-admin-claim.mjs correo@ejemplo.com
   ```
5. Recién ahí: `firebase deploy --only firestore:rules`.
6. Cada cuenta con el claim nuevo debe cerrar sesión y volver a entrar en
   `/admin` (o esperar ~1h a que su token se refresque) para que el cambio
   surta efecto.
7. Borra el archivo de la clave privada de tu computador cuando termines —
   no hace falta guardarlo, se puede regenerar cuando se necesite.


## Publicar
```
npm run deploy
```
Dominio propio: Hosting → *Add custom domain* → seguir los pasos de DNS.

## Pruebas automatizadas

**Componentes** (Vitest + React Testing Library) — validan lo que de verdad rompería el negocio si fallara: el formulario de cotización, el cambio de idioma, y que el panel `/admin` nunca muestre datos de clientes sin sesión iniciada.
```
npm test          # corre una vez
npm run test:watch  # modo watch mientras desarrollas
```

**E2E** (Playwright) — flujo real en el navegador contra el servidor de desarrollo. No envían el formulario de verdad (eso escribiría un lead falso en el Firestore real del cliente) — solo validan la navegación, el cambio de idioma y que la validación de campos requeridos funcione.
```
npx playwright install chromium   # una sola vez
npm run test:e2e
```

**Reglas de Firestore** (Firebase Emulator Suite) — corre las reglas de seguridad reales (`firestore.rules`) contra un Firestore local, sin tocar el proyecto real. Prueba, por ejemplo, que un visitante anónimo puede crear una cotización pero no puede leerlas, que el campo `status` no se puede falsificar al crear, y que la colección `feedback` (antes 100% pública) ahora está protegida.
```
npm run test:rules
```
La primera vez, si no tienes el Firebase CLI instalado globalmente: `npm install -g firebase-tools`. El comando levanta el emulador de Firestore, corre las pruebas, y lo apaga solo — no requiere el proyecto real ni credenciales.
