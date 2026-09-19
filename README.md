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
