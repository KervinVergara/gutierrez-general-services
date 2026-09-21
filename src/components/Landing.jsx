import { useEffect, useState } from 'react'
import { content, PHONE_DISPLAY, PHONE_TEL, PHONE_WA, BUSINESS } from '../content'
import Icon from './Icon'
import QuoteForm from './QuoteForm'
import FeedbackWidget from './FeedbackWidget'
import logo from '../assets/photos/logo-new.png'
import heroPhoto from '../assets/photos/curated/01_lavado_en_accion.jpeg'
import heroPhotoSecondary from '../assets/photos/stock-exterior-siding.jpeg'
import svcAuto from '../assets/photos/curated/02_brillo_pintura.jpeg'
import svcProperty from '../assets/photos/stock-exterior-gutter.jpeg'
import svcSeasonal from '../assets/photos/stock-leaves.jpeg'
import galTruck from '../assets/photos/curated/03_camioneta_negra.jpeg'
import galInterior from '../assets/photos/curated/04_interior_cuero.jpeg'
import galJeep from '../assets/photos/curated/06_jeep_blanco.jpeg'
import galBoat from '../assets/photos/curated/07_bote.jpeg'
import galFoam from '../assets/photos/curated/08_lavado_espuma.jpeg'
import galPolish from '../assets/photos/curated/09_pulido_en_accion.jpeg'

const WA_GREETING = { en: "Hi! I'd like to get a quote.", es: '¡Hola! Quisiera una cotización.' }
const navLinkCls = "relative py-2 text-ink/75 hover:text-ink transition-colors after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:bg-gold after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200"
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
  const [lightbox, setLightbox] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const waHref = `https://wa.me/${PHONE_WA}?text=${encodeURIComponent(WA_GREETING[lang])}`
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
    { id: 'boat', photo: galBoat, pos: 'object-center', alt: lang === 'en' ? 'Boat detailing' : 'Detallado de bote', caption: lang === 'en' ? 'Boat detailing' : 'Detallado de bote' },
    { id: 'foam', photo: galFoam, pos: 'object-center', alt: lang === 'en' ? 'Vehicle wash in progress' : 'Lavado de vehículo en proceso', caption: lang === 'en' ? 'Wash in progress' : 'Lavado en proceso' },
    { id: 'polish', photo: galPolish, pos: 'object-bottom', alt: lang === 'en' ? 'Paint polishing detail' : 'Detalle de pulido de pintura', caption: lang === 'en' ? 'Paint polishing' : 'Pulido de pintura' },
  ]

  return (
    <div className="min-h-screen bg-sand">
      {/* HEADER */}
      <header className={`sticky top-0 z-40 transition-colors duration-200 ${scrolled ? 'bg-sand border-b border-ink/10 shadow-[0_2px_10px_-4px_rgba(18,59,85,0.12)]' : 'bg-sand/95 backdrop-blur-sm border-b border-transparent'}`}>
        <div className="mx-auto max-w-6xl px-4 h-20 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center shrink-0">
            <img src={logo} alt={BUSINESS} className="h-12 md:h-14 w-auto object-contain" />
          </a>
          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-semibold text-ink/75">
            <a href="#services" className={navLinkCls}>{t.nav.services}</a>
            <a href="#plans" className={navLinkCls}>{t.nav.plans}</a>
            <a href="#work" className={navLinkCls}>{t.nav.ourWork}</a>
            <a href="#contact" className={navLinkCls}>{t.nav.contact}</a>
            <span className="w-px h-5 bg-ink/15" aria-hidden="true" />
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="text-ink/60 hover:text-ink text-sm font-bold transition-colors" aria-label="Switch language">EN / ES</button>
          </nav>
          <div className="flex items-center gap-2 shrink-0 lg:hidden">
            <a href="#contact" className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-gold text-ink font-bold text-sm hover:bg-gold-2 whitespace-nowrap">{t.nav.quoteShort}</a>
            <button onClick={() => setOpen(!open)} className="grid place-items-center w-10 h-10 rounded-lg border border-ink/15 shrink-0" aria-label="Menu">
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
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 grid md:grid-cols-12 gap-6 md:gap-6 items-center">
          <div className="md:col-span-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.hero.kicker}</p>
            <h1 className="mt-4 text-[2.75rem] sm:text-6xl md:text-[3.75rem] font-extrabold leading-[1.03] tracking-tight text-ink">
              {t.hero.titleLines.map((line) => <span key={line} className="block">{line}</span>)}
            </h1>
            <p className="mt-5 text-lg text-steel max-w-md">{t.hero.sub}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
              <a href="#contact" className="inline-flex items-center justify-center h-13 px-7 rounded-full bg-gold text-ink font-bold text-lg hover:bg-gold-2">{t.hero.cta1}</a>
              <a href="#work" className="inline-flex items-center gap-1.5 text-ink font-bold text-lg hover:underline">{t.hero.cta2} <Icon name="arrowRight" size={18} /></a>
            </div>
            <p className="mt-5 text-sm text-steel flex items-center gap-2">
              <span>{t.trust.points[0].title}</span>
              <span aria-hidden="true">•</span>
              <span>{t.trust.points[2].title}</span>
            </p>
          </div>
          <div className="hidden md:block md:col-span-2">
            <button
              type="button"
              onClick={() => setLightbox({ src: heroPhotoSecondary, alt: lang === 'en' ? 'Exterior house pressure washing' : 'Lavado a presión exterior de una vivienda' })}
              className="relative block w-full h-72 md:h-[420px] rounded-3xl overflow-hidden shadow-sm cursor-zoom-in"
            >
              <img src={heroPhotoSecondary} alt={lang === 'en' ? 'Exterior house pressure washing' : 'Lavado a presión exterior de una vivienda'} className="w-full h-full object-cover" />
            </button>
          </div>
          <div className="md:col-span-4">
            <button
              type="button"
              onClick={() => setLightbox({ src: heroPhoto, alt: lang === 'en' ? 'Team member washing a vehicle' : 'Trabajador lavando un vehículo' })}
              className="relative block w-full max-w-sm md:max-w-full mx-auto h-72 md:h-[420px] rounded-3xl overflow-hidden shadow-sm cursor-zoom-in"
            >
              <img src={heroPhoto} alt={lang === 'en' ? 'Team member washing a vehicle' : 'Trabajador lavando un vehículo'} className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-12 md:py-20 scroll-mt-20">
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
      <section id="plans" className="bg-mist scroll-mt-20">
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
      <section id="work" className="mx-auto max-w-6xl px-4 py-16 md:py-24 scroll-mt-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/70">{t.gallery.eyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.gallery.title}</h2>
        <p className="mt-3 text-lg text-steel max-w-2xl">{t.gallery.sub}</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {galleryItems.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setLightbox({ src: g.photo, alt: g.alt })}
              className="relative aspect-square rounded-xl overflow-hidden bg-white cursor-zoom-in"
            >
              <img src={g.photo} alt={g.alt} className={`w-full h-full object-cover ${g.pos || ''}`} loading="lazy" />
              <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1">{g.caption}</span>
            </button>
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
      <section id="contact" className="relative bg-ink text-white overflow-hidden scroll-mt-20">
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
          <p><a href={`tel:${PHONE_TEL}`} className="hover:underline">{PHONE_DISPLAY}</a> · <a href={waHref} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a> · {t.footer.made} <a href="https://sistemaskv.com" className="hover:underline">SistemasKV</a></p>
        </div>
      </footer>

      <FeedbackWidget t={t.feedback} />

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-ink/90 grid place-items-center p-4" onClick={() => setLightbox(null)}>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            className="absolute top-4 right-4 grid place-items-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="x" size={20} />
          </button>
          <img src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
