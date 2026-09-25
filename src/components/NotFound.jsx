import { useEffect, useState } from 'react'
import Icon from './Icon'
import { BUSINESS, PHONE_DISPLAY, PHONE_TEL } from '../content'

function detectLang() {
  const saved = localStorage.getItem('lang')
  if (saved) return saved
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

const t = {
  en: {
    kicker: '404 error',
    title: "Page not found",
    text: "The page you're looking for doesn't exist or may have moved.",
    home: 'Back to home',
    call: 'Call us',
  },
  es: {
    kicker: 'Error 404',
    title: 'Página no encontrada',
    text: 'La página que buscas no existe o pudo haberse movido.',
    home: 'Volver al inicio',
    call: 'Llámanos',
  },
}

export default function NotFound() {
  const [lang] = useState(detectLang)
  useEffect(() => { document.documentElement.lang = lang; document.title = `404 — ${BUSINESS}` }, [lang])
  const c = t[lang]

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-mist text-ink mb-6"><Icon name="car" size={32} /></span>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">{c.kicker}</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{c.title}</h1>
        <p className="mt-3 text-steel">{c.text}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/" className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-gold text-ink font-bold hover:bg-gold-2">{c.home}</a>
          <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center h-12 px-6 rounded-full border-2 border-ink/15 font-bold text-ink hover:border-ink">{c.call} {PHONE_DISPLAY}</a>
        </div>
      </div>
    </div>
  )
}
