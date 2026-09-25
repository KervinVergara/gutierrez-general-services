import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import Admin from './components/Admin'
import Privacy from './components/Privacy'
import Terms from './components/Terms'
import NotFound from './components/NotFound'

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
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
