import { useState } from 'react'
import { content, PHONE_DISPLAY, PHONE_TEL, PHONE_WA, BUSINESS } from '../content'
import Icon from './Icon'
import QuoteForm from './QuoteForm'
import logo from '../assets/photos/logo-new.png'
import svcExterior from '../assets/photos/svc-pressure.jpeg'
import svcVehicle from '../assets/photos/svc-trucks.jpeg'
import heroOverlay from '../assets/photos/svc-polish.jpeg'
import truck1Before from '../assets/photos/truck1-before.jpeg'
import truck1After from '../assets/photos/truck1-after.jpeg'
import truck2Before from '../assets/photos/truck2-before.jpeg'
import truck2After from '../assets/photos/truck2-after.jpeg'

const groupImages = { exterior: svcExterior, seasonal: null, vehicle: svcVehicle }
const groupIcons = { exterior: 'water', seasonal: 'leaf', vehicle: 'car' }
const groupOrder = ['exterior', 'seasonal', 'vehicle']
const truckPairs = [
  { before: truck1Before, after: truck1After },
  { before: truck2Before, after: truck2After },
]

export default function Landing({ lang, setLang }) {
  const t = content[lang]
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)
  const [galleryFilter, setGalleryFilter] = useState('all')
  const [presetService, setPresetService] = useState('')

  const byGroup = groupOrder.map((g) => ({ key: g, items: t.services.filter((s) => s.group === g) }))

  function quoteFor(serviceId) {
    setPresetService(serviceId)
    setActiveGroup(null)
    setOpen(false)
  }

  const galleryItems = [
    ...truckPairs.map((p, n) => ({ id: `veh-${n}`, group: 'vehicle', pair: p })),
    { id: 'ext-0', group: 'exterior' },
    { id: 'ext-1', group: 'exterior' },
    { id: 'sea-0', group: 'seasonal' },
    { id: 'sea-1', group: 'seasonal' },
  ]
  const shownGallery = galleryFilter === 'all' ? galleryItems : galleryItems.filter((g) => g.group === galleryFilter)
  const galleryCatLabel = { exterior: t.gallery.catExterior, seasonal: t.gallery.catSeasonal, vehicle: t.gallery.catVehicle }

  return (
    <div className="min-h-screen bg-sand">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-sand/95 backdrop-blur-sm border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 h-20 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center shrink-0">
            <img src={logo} alt={BUSINESS} className="h-9 md:h-11 w-auto object-contain" />
          </a>
          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-semibold text-ink">
            <a href="#services" className="hover:text-gold-2">{t.nav.services}</a>
            <a href="#work" className="hover:text-gold-2">{t.nav.ourWork}</a>
            <a href="#seasonal" className="hover:text-gold-2">{t.nav.seasonal}</a>
            <a href="#contact" className="hover:text-gold-2">{t.nav.contact}</a>
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="hover:text-gold-2" aria-label="Switch language">EN / ES</button>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <a href="#contact" className="hidden sm:inline-flex items-center h-11 px-5 rounded-full bg-gold text-ink font-bold text-sm whitespace-nowrap hover:bg-gold-2">{t.nav.quote}</a>
            <button onClick={() => setOpen(!open)} className="lg:hidden grid place-items-center w-10 h-10 rounded-lg border border-ink/15 shrink-0" aria-label="Menu">
              <Icon name={open ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-ink/10 px-4 py-3 flex flex-col gap-1 text-base font-medium bg-sand">
            {[['#services', t.nav.services], ['#work', t.nav.ourWork], ['#seasonal', t.nav.seasonal], ['#contact', t.nav.contact]].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="py-3 border-b border-ink/10 last:border-0 hover:text-gold-2">{l}</a>
            ))}
            <button onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); setOpen(false) }} className="py-3 text-left border-b border-ink/10 hover:text-gold-2">EN / ES</button>
            <a href="#contact" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center justify-center h-12 rounded-full bg-gold text-ink font-bold">{t.nav.quote}</a>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-12 md:gap-10 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-2">{t.hero.kicker}</p>
            <h1 className="mt-4 text-[2.6rem] sm:text-5xl md:text-[3.4rem] font-extrabold leading-[1.05] text-ink">
              {t.hero.titleLines.map((line) => <span key={line} className="block">{line}</span>)}
            </h1>
            <p className="mt-6 text-lg text-steel max-w-md">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="#contact" className="inline-flex items-center justify-center h-13 px-7 rounded-full bg-gold text-ink font-bold text-lg hover:bg-gold-2">{t.hero.cta1}</a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 font-bold text-ink hover:text-gold-2">
                <span className="grid place-items-center w-10 h-10 rounded-full bg-white text-ink shadow-sm"><Icon name="phone" size={18} /></span>
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-dashed border-ink/20 bg-white/70 flex flex-col items-center justify-center gap-2 text-center px-6">
              <Icon name="image" size={34} className="text-ink/25" />
              <p className="text-sm font-semibold text-steel">{lang === 'en' ? 'Photo pending: exterior cleaning at a home entrance' : 'Foto pendiente: limpieza exterior en la entrada de una vivienda'}</p>
            </div>
            <div className="hidden sm:block absolute -bottom-6 -right-4 md:-right-8 w-32 md:w-40 aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-lg">
              <img src={heroOverlay} alt={lang === 'en' ? 'Vehicle detailing close-up' : 'Detallado de vehículo de cerca'} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-2">{t.servicesEyebrow}</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.servicesTitle}</h2>
        <p className="mt-3 text-lg text-steel max-w-2xl">{t.servicesSub}</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {byGroup.map(({ key, items }) => {
            const g = t.groups[key]
            const img = groupImages[key]
            const primaryId = items[0]?.id
            return (
              <div key={key} id={key === 'seasonal' ? 'seasonal' : undefined}>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-mist">
                  {img ? (
                    <img src={img} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                      <Icon name={groupIcons[key]} size={30} className="text-ink/25" />
                      <p className="text-xs font-semibold text-steel">{lang === 'en' ? 'Photo pending' : 'Foto pendiente'}</p>
                    </div>
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink">{g.title}</h3>
                <p className="mt-2 text-steel">{g.lead}</p>
                <div className="mt-4 flex items-center gap-5 text-sm font-bold">
                  <button onClick={() => setActiveGroup(key)} className="text-ink hover:text-gold-2 inline-flex items-center gap-1">{t.details} <Icon name="arrowRight" size={15} /></button>
                  <a href="#contact" onClick={() => quoteFor(primaryId)} className="text-gold-2 hover:text-ink">{t.nav.quote}</a>
                </div>
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
                    {s.priceType === 'from' && <span className="shrink-0 text-sm font-bold text-gold-2">{t.from} {s.price}</span>}
                    {s.priceType === 'quote' && <span className="shrink-0 text-xs font-semibold text-steel">{t.quote}</span>}
                    {s.priceType === 'free' && <span className="shrink-0 text-xs font-semibold text-steel">{t.freeQuote}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-steel">{s.lead}</p>
                  <ul className="mt-2 grid gap-1 text-sm text-ink/80">
                    {s.items.map((i) => <li key={i} className="flex items-start gap-2"><Icon name="check" size={15} className="text-gold-2 mt-0.5 shrink-0" /> {i}</li>)}
                  </ul>
                  {s.note && <p className="mt-2 text-xs text-steel">{s.note}</p>}
                  <a href="#contact" onClick={() => quoteFor(s.id)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-gold-2 hover:text-ink">{t.nav.quote} <Icon name="arrowRight" size={14} /></a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OUR WORK */}
      <section id="work" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-2">{t.gallery.eyebrow}</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">{t.gallery.title}</h2>
          <p className="mt-3 text-lg text-steel max-w-2xl">{t.gallery.sub}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[['all', t.gallery.all], ['exterior', t.gallery.catExterior], ['seasonal', t.gallery.catSeasonal], ['vehicle', t.gallery.catVehicle]].map(([key, label]) => (
              <button key={key} onClick={() => setGalleryFilter(key)} className={`h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${galleryFilter === key ? 'bg-gold text-ink border-gold' : 'bg-white text-ink border-ink/15 hover:border-gold-2'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
            {shownGallery.map((g) => (
              g.pair ? (
                <div key={g.id} className="rounded-xl overflow-hidden border border-ink/10 bg-white">
                  <div className="grid grid-cols-2">
                    <div className="relative aspect-square">
                      <img src={g.pair.before} alt={`${t.gallery.before} — ${galleryCatLabel[g.group]}`} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/85 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t.gallery.before}</span>
                    </div>
                    <div className="relative aspect-square">
                      <img src={g.pair.after} alt={`${t.gallery.after} — ${galleryCatLabel[g.group]}`} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gold text-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t.gallery.after}</span>
                    </div>
                  </div>
                  <p className="px-3 py-2 text-xs font-medium text-steel">{galleryCatLabel[g.group]}</p>
                </div>
              ) : (
                <div key={g.id} className="aspect-square rounded-xl border border-dashed border-ink/15 bg-white flex flex-col items-center justify-center gap-2 text-center px-2">
                  <Icon name={groupIcons[g.group]} size={24} className="text-ink/25" />
                  <span className="text-xs font-medium text-ink/60">{galleryCatLabel[g.group]}</span>
                  <span className="text-[11px] text-steel">{t.gallery.soon}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE / CONTACT */}
      <section id="contact" className="relative bg-ink text-white overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-[1fr_1.1fr] gap-12">
          <div className="flex flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{t.contact.eyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">{t.contact.title}</h2>
            <p className="mt-4 text-white/75 text-lg max-w-sm">{t.contact.sub}</p>
            <div className="mt-auto pt-10 text-right md:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Warsaw, Indiana</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{t.footer.tagline}</p>
            </div>
          </div>
          <QuoteForm t={t.contact} services={t.services} lang={lang} presetService={presetService} id="quote-form" />
        </div>
      </section>

      <footer className="bg-sand text-steel text-sm border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} {BUSINESS}. {t.footer.rights}</p>
          <p><a href={`tel:${PHONE_TEL}`} className="hover:text-gold-2">{PHONE_DISPLAY}</a> · {t.footer.made} <a href="https://sistemaskv.com" className="hover:text-gold-2">SistemasKV</a></p>
        </div>
      </footer>
    </div>
  )
}
