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

Pendiente: pruebas de integración contra el Firebase Emulator Suite (Firestore + Auth locales) para probar el flujo completo de guardado sin tocar el proyecto real.
