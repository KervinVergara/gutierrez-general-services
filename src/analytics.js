// Google Analytics 4 — inert until VITE_GA_MEASUREMENT_ID is set in .env.
// Safe to leave the env var empty: nothing is loaded, no cookies, no tracking.
// To activate: create a GA4 property at analytics.google.com, copy its
// Measurement ID (starts with "G-"), add VITE_GA_MEASUREMENT_ID=G-XXXXXXX
// to .env, then `npm run build && npm run deploy`.
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

if (measurementId) {
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', measurementId, { anonymize_ip: true })
}
