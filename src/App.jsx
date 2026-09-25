import { useEffect, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import Privacy from './components/Privacy'
import Terms from './components/Terms'
import NotFound from './components/NotFound'

// Code-split the admin panel away from the public bundle: Admin.jsx pulls in
// all 8 CRM tabs plus admin-only assets, none of which a public visitor
// should ever have to download. This is the only change in this file —
// same routes, same components, same behavior once loaded.
const Admin = lazy(() => import('./components/Admin'))

function detectLang() {
  const saved = localStorage.getItem('lang')
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export default function App() {
  const [lang, setLangState] = useState(detectLang)
  const setLang = (l) => { localStorage.setItem('lang', l); setLangState(l) }
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing lang={lang} setLang={setLang} />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<div className="min-h-screen bg-sand" />}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
