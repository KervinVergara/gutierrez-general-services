import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Copy these values from Firebase Console → Project settings → Your apps (Web).
// In production put them in a .env file as VITE_FIREBASE_* (see .env.example).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = isConfigured ? initializeApp(firebaseConfig) : null
export const db = app ? getFirestore(app) : null
export const auth = app ? getAuth(app) : null

// App Check (anti-bot / anti-abuse on Firestore writes from the public form).
// Inert until VITE_RECAPTCHA_SITE_KEY is set — see README "App Check" section
// for how to get that key and turn on enforcement in the Firebase console.
// Safe to leave the env var empty: the app just runs without it, same as today.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (app && recaptchaSiteKey) {
  import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  })
}
