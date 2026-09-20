import { useState } from 'react'
import { content, PHONE_DISPLAY, PHONE_TEL, PHONE_WA, BUSINESS } from '../content'
import Icon from './Icon'
import QuoteForm from './QuoteForm'
import FeedbackWidget from './FeedbackWidget'
import logo from '../assets/photos/logo-new.png'
import heroMain from '../assets/photos/stock-exterior-siding.jpeg'
import heroOverlay from '../assets/photos/curated/01_lavado_en_accion.jpeg'
import svcAuto from '../assets/photos/curated/02_brillo_pintura.jpeg'
import svcProperty from '../assets/photos/stock-exterior-gutter.jpeg'
import svcSeasonal from '../assets/photos/stock-leaves.jpeg'
import galTruck from '../assets/photos/curated/03_camioneta_negra.jpeg'
import galInterior from '../assets/photos/curated/04_interior_cuero.jpeg'
import galJeep from '../assets/photos/curated/06_jeep_blanco.jpeg'
import galBoat from '../assets/photos/curated/07_bote.jpeg'
import galFoam from '../assets/photos/curated/08_lavado_espuma.jpeg'
import galPolish from '../assets/photos/curated/09_pulido_en_accion.jpeg'

const groupImages = { auto: svcAuto, property: svcProperty, seasonal: svcSeasonal }
const groupIcons = { auto: 'car', property: 'water', seasonal: 'leaf' }
const groupOrder = ['auto', 'property', 'seasonal']
const groupCaptions = {
  auto: { en: 'Vehicle detailing', es: 'Detallado de vehículos' },
  property: { en: 'Gutter cleaning', es: 'Limpieza de canaletas' },
  seasonal: { en: 'Seasonal care', es: 'Cuidado de temporada' },
}

export default function Landing({ lang, setLang }) {
  const t = content[lang]
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)
  const [presetService, setPresetService] = useState('')
  const [presetType, setPresetType] = useState('')

  const byGroup = groupOrder.map((g) => ({ key: g, items: t.services.filter((s) => s.group === g && !s.hidden) }))

  function quoteFor(serviceId) {
    const group = t.services.find((s) => s.id === serviceId)?.group
    setPresetType(group === 'auto' ? 'vehicle' : 'home')
    setPresetService(serviceId)
    setActiveGroup(null)
    setOpen(false)
  }

  const galleryItems = [
    { id: 'truck', photo: galTruck, pos: 'object-center', alt: lang === 'en' ? 'Detailed truck exterior' : 'Exterior de camioneta detallada', caption: lang === 'en' ? 'Detailed truck' : 'Camioneta detallada' },
    { id: 'interior', photo: galInterior, pos: 'object-center', alt: lang === 'en' ? 'Detailed leather interior' : 'Interior de cuero detallado', caption: lang === 'en' ? 'Leather interior' : 'Interior de cuero' },
    { id: 'jeep', photo: galJeep, pos: 'object-bottom', alt: lang === 'en' ? 'Clean SUV exterior' : 'Exterior de SUV limpio', caption: lang === 'en' ? 'Clean SUV' : 'SUV limpio' },
    { id: 'boat', photo: galBoat, fit: 'contain', alt: lang === 'en' ? 'Boat detailing' : 'Detallado de bote', caption: lang === 'en' ? 'Boat detailing' : 'Detallado de bote' },
    { id: 'foam', photo: galFoam, pos: 'object-center', alt: lang === 'en' ? 'Vehicle wash in progress' : 'Lavado de vehículo en proceso', caption: lang === 'en' ? 'Wash in progress' : 'Lavado en proceso' },
    { id: 'polish', photo: galPolish, pos: 'object-bottom', alt: lang === 'en' ? 'Paint polishing detail' : 'Detalle de pulido de pintura', caption: lang === 'en' ? 'Paint polishing' : 'Pulido de pintura' },
  ]

  return (
    <div className="min-h-screen bg-sand">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-sand/95 backdrop-blur-sm border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 h-20 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center shrink-0">
            <img src={logo} alt={BUSINESS} className="h-11 md:h-14 w-auto object-contain" />
          </a>
          <nav className="hidden lg:flex items-center gap-1 text-[15px] font-semibold text-ink">
            <a href="#services" className="px-4 py-2 rounded-full transition-colors hover:bg-mist">{t.nav.services}</a>
            <a href="#plans" className="px-4 py-2 rounded-full transition-colors hover:bg-mist">{t.nav.plans}</a>
            <a href="#work" className="px-4 py-2 rounded-full transition-colors hover:bg-mist">{t.nav.ourWork}</a>
            <a href="#contact" className="px-4 py-2 rounded-full transition-colors hover:bg-mist">{t.nav.contact}</a>
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="px-4 py-2 rounded-full transition-colors hover:bg-mist" aria-label="Switch language">EN / ES</button>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setOpen(!open)} className="lg:hidden grid place-items-center w-10 h-10 rounded-lg border border-ink/15 shrink-0" aria-label="Menu">
              <Icon name={open ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-ink/10 px-4 py-3 flex flex-col gap-1 text-base font-medium bg-sand">
            {[['#services', t.nav.services], ['#plans', t.nav.plans], ['#work', t.nav.ourWork], ['#contact', t.nav.contact]].map(([h, l]) => (
              <a key={l} href={h} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg border-b border-ink/10 last:border-0 hover:bg-mist">{l}</a>
            ))}
            <button onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); setOpen(false) }} className="px-3 py-3 rounded-lg text-left hover:bg-mist">EN / ES</button>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-12 md:gap-10 items-start">
          <div className="md:pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.hero.kicker}</p>
            <h1 className="mt-4 text-[2.6rem] sm:text-5xl md:text-[3.4rem] font-extrabold leading-[1.05] text-ink">
              {t.hero.titleLines.map((line) => <span key={line} className="block">{line}</span>)}
            </h1>
            <p className="mt-6 text-lg text-steel max-w-md">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="#contact" className="inline-flex items-center justify-center h-13 px-7 rounded-full bg-gold text-ink font-bold text-lg hover:bg-gold-2">{t.hero.cta1}</a>
              <a href="#services" className="inline-flex items-center justify-center h-13 px-6 rounded-full border-2 border-ink/15 text-ink font-bold text-lg hover:border-ink">{t.hero.cta2}</a>
            </div>
            <a href={`tel:${PHONE_TEL}`} className="mt-6 inline-flex items-center gap-2 font-bold text-ink hover:underline">
              <span className="grid place-items-center w-10 h-10 rounded-full bg-white text-ink shadow-sm"><Icon name="phone" size={18} /></span>
              {PHONE_DISPLAY}
            </a>
          </div>
          <div className="relative max-w-sm mx-auto md:mx-0 md:ml-auto">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-sm">
              <img src={heroMain} alt={lang === 'en' ? 'Exterior pressure washing at a home' : 'Lavado a presión exterior en una vivienda'} className="w-full h-full object-cover" />
              <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">{lang === 'en' ? 'Property care' : 'Cuidado de propiedad'}</span>
            </div>
            <div className="hidden sm:block absolute -bottom-6 right-2 md:right-4 w-32 md:w-40 aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-lg">
              <img src={heroOverlay} alt={lang === 'en' ? 'Team member washing a vehicle' : 'Trabajador lavando un vehículo'} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.servicesEyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.servicesTitle}</h2>
        <p className="mt-3 text-lg text-steel max-w-2xl">{t.servicesSub}</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {byGroup.map(({ key }) => {
            const g = t.groups[key]
            const img = groupImages[key]
            return (
              <div key={key}>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-mist flex items-center justify-center">
                  {img ? (
                    <>
                      <img src={img} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">{groupCaptions[key][lang]}</span>
                    </>
                  ) : (
                    <Icon name={groupIcons[key]} size={56} className="text-ink/20" />
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink">{g.title}</h3>
                <p className="mt-2 text-steel">{g.lead}</p>
                <button onClick={() => setActiveGroup(key)} className="mt-4 text-sm font-bold text-ink hover:underline inline-flex items-center gap-1">{t.details} <Icon name="arrowRight" size={15} /></button>
              </div>
            )
          })}
        </div>
      </section>

      {/* GROUP / SERVICE DETAILS MODAL */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={() => setActiveGroup(null)}>
          <div className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-xl bg-mist text-ink shrink-0"><Icon name={groupIcons[activeGroup]} size={24} /></span>
                <h3 className="text-2xl font-bold text-ink">{t.groups[activeGroup].title}</h3>
              </div>
              <button onClick={() => setActiveGroup(null)} aria-label={t.close} className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 shrink-0 hover:border-ink"><Icon name="x" size={18} /></button>
            </div>
            <div className="mt-5 grid gap-5">
              {byGroup.find((b) => b.key === activeGroup).items.map((s) => (
                <div key={s.id} className="border-t border-ink/10 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-ink">{s.title}</h4>
                    {s.priceType === 'from' && <span className="shrink-0 text-sm font-bold text-ink">{t.from} {s.price}</span>}
                    {s.priceType === 'quote' && <span className="shrink-0 text-xs font-semibold text-steel">{t.quote}</span>}
                    {s.priceType === 'free' && <span className="shrink-0 text-xs font-semibold text-steel">{t.freeQuote}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-steel">{s.lead}</p>
                  <ul className="mt-2 grid gap-1 text-sm text-ink/80">
                    {s.items.map((i) => <li key={i} className="flex items-start gap-2"><Icon name="check" size={15} className="text-ink/50 mt-0.5 shrink-0" /> {i}</li>)}
                  </ul>
                  {s.note && <p className="mt-2 text-xs text-steel">{s.note}</p>}
                  <a href="#contact" onClick={() => quoteFor(s.id)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ink hover:underline">{t.nav.quote} <Icon name="arrowRight" size={14} /></a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.howItWorks.eyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.howItWorks.title}</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-8">
          {t.howItWorks.steps.map((s, i) => (
            <div key={s.title}>
              <span className="text-3xl font-extrabold text-gold-2">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-steel">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MONTHLY CARE PLANS */}
      <section id="plans" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.plans.eyebrow}</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.plans.title}</h2>
          <p className="mt-3 text-lg text-steel max-w-2xl">{t.plans.sub}</p>
          <div className="mt-6 rounded-2xl bg-white border border-ink/10 p-6 md:p-7 flex flex-wrap items-center justify-between gap-4">
            <p className="text-lg font-bold text-ink">{t.plans.priceFrom}</p>
            <a href="#contact" className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-gold text-ink font-bold hover:bg-gold-2">{t.plans.cta}</a>
          </div>
        </div>
      </section>

      {/* OUR WORK */}
      <section id="work" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.gallery.eyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.gallery.title}</h2>
        <p className="mt-3 text-lg text-steel max-w-2xl">{t.gallery.sub}</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {galleryItems.map((g) => (
            <div key={g.id} className="relative aspect-square rounded-xl overflow-hidden bg-white">
              <img src={g.photo} alt={g.alt} className={`w-full h-full ${g.fit === 'contain' ? 'object-contain' : `object-cover ${g.pos}`}`} loading="lazy" />
              <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">{g.caption}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.trust.eyebrow}</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink max-w-2xl">{t.trust.title}</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            {t.trust.points.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="grid place-items-center w-12 h-12 rounded-xl bg-white text-ink shrink-0 shadow-sm"><Icon name={p.icon} size={22} /></span>
                <div>
                  <h3 className="font-bold text-ink">{p.title}</h3>
                  <p className="mt-1 text-steel">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE / CONTACT */}
      <section id="contact" className="relative bg-ink text-white overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{t.contact.title}</h2>
            <p className="mt-4 text-white/75 text-lg">{t.contact.sub}</p>
          </div>
          <div className="mt-8 max-w-[900px] mx-auto">
            <QuoteForm t={t.contact} services={t.services} lang={lang} presetService={presetService} presetType={presetType} id="quote-form" />
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Warsaw, Indiana</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{t.footer.tagline}</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-sand">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-ink">{t.finalCta.title}</h2>
          <p className="mt-3 text-lg text-steel">{t.finalCta.text}</p>
          <a href="#contact" className="mt-7 inline-flex items-center justify-center h-13 px-8 rounded-full bg-gold text-ink font-bold text-lg hover:bg-gold-2">{t.finalCta.cta}</a>
        </div>
      </section>

      <footer className="bg-sand text-steel text-sm border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} {BUSINESS}. {t.footer.rights}</p>
          <p><a href={`tel:${PHONE_TEL}`} className="hover:underline">{PHONE_DISPLAY}</a> · {t.footer.made} <a href="https://sistemaskv.com" className="hover:underline">SistemasKV</a></p>
        </div>
      </footer>

      <FeedbackWidget t={t.feedback} />
    </div>
  )
}
