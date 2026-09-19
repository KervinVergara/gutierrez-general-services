import { useState } from 'react'
import { content, PHONE_DISPLAY, PHONE_TEL, PHONE_SMS, PHONE_WA, BUSINESS } from '../content'
import Icon from './Icon'
import QuoteForm from './QuoteForm'
import logo from '../assets/photos/logo-wordmark.png'
import heroPhoto from '../assets/photos/hero.jpeg'
import svcDetailing from '../assets/photos/svc-detailing.jpeg'
import svcPolish from '../assets/photos/svc-polish.jpeg'
import svcCeramic from '../assets/photos/svc-ceramic.jpeg'
import svcTrucks from '../assets/photos/svc-trucks.jpeg'
import svcRv from '../assets/photos/svc-rv.jpeg'
import svcPressure from '../assets/photos/svc-pressure.jpeg'
import truck1Before from '../assets/photos/truck1-before.jpeg'
import truck1After from '../assets/photos/truck1-after.jpeg'
import truck2Before from '../assets/photos/truck2-before.jpeg'
import truck2After from '../assets/photos/truck2-after.jpeg'

const whyIcons = ['hand', 'layers', 'tag', 'pin']
const galleryIcons = ['car', 'truck', 'rv', 'tractor', 'water']
const serviceImages = { detailing: svcDetailing, polish: svcPolish, ceramic: svcCeramic, trucks: svcTrucks, rv: svcRv, pressure: svcPressure }
const truckPairs = [
  { before: truck1Before, after: truck1After },
  { before: truck2Before, after: truck2After },
]

export default function Landing({ lang, setLang }) {
  const t = content[lang]
  const [open, setOpen] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState('all')
  const [activeService, setActiveService] = useState(null)
  const galleryItems = t.gallery.categories.flatMap((cat, ci) => {
    if (cat === t.gallery.categories[1]) return truckPairs.map((p, n) => ({ id: `truck-${n}`, cat, pair: p }))
    return [0, 1].map((n) => ({ id: `${ci}-${n}`, cat, icon: galleryIcons[ci] }))
  })
  const shownGallery = galleryFilter === 'all' ? galleryItems : galleryItems.filter((g) => g.cat === galleryFilter)

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white text-ink border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-6">
          <a href="#top" className="flex items-center shrink-0">
            <img src={logo} alt={BUSINESS} className="h-10 md:h-12 w-auto object-contain" />
          </a>
          <nav className="hidden lg:flex items-center gap-1.5 text-sm font-semibold shrink-0">
            <a href="#services" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-transparent hover:border-blue/30 hover:bg-blue/5 hover:text-blue transition-colors">{t.nav.services}</a>
            <a href="#gallery" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-transparent hover:border-blue/30 hover:bg-blue/5 hover:text-blue transition-colors">{t.gallery.title}</a>
            <a href="#testimonials" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-transparent hover:border-blue/30 hover:bg-blue/5 hover:text-blue transition-colors">{t.nav.reviews}</a>
            <a href="#about" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-transparent hover:border-blue/30 hover:bg-blue/5 hover:text-blue transition-colors">{t.about.title}</a>
            <a href="#area" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-transparent hover:border-blue/30 hover:bg-blue/5 hover:text-blue transition-colors">{t.nav.area}</a>
            <a href="#contact" className="whitespace-nowrap px-3.5 py-2 rounded-full border border-blue/20 bg-blue/5 text-blue hover:bg-blue/10 transition-colors">{t.nav.contact}</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-ink/15 text-sm font-semibold whitespace-nowrap hover:border-blue hover:text-blue" aria-label="Switch language">
              <Icon name="globe" size={18} /> {lang === 'en' ? 'ES' : 'EN'}
            </button>
            <a href={`tel:${PHONE_TEL}`} className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gold text-ink font-bold whitespace-nowrap hover:bg-gold-2">
              <Icon name="phone" size={18} /> {t.nav.call}
            </a>
            <button onClick={() => setOpen(!open)} className="lg:hidden grid place-items-center w-10 h-10 rounded-lg border border-ink/15 shrink-0" aria-label="Menu">
              <Icon name={open ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-ink/10 px-4 py-3 flex flex-col gap-1 text-base font-medium bg-white">
            {[['#services', t.nav.services], ['#gallery', t.gallery.title], ['#testimonials', t.nav.reviews], ['#about', t.about.title], ['#area', t.nav.area], ['#contact', t.nav.contact]].map(([h, l]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="py-3 border-b border-ink/10 last:border-0 hover:text-blue">{l}</a>
            ))}
            <a href={`tel:${PHONE_TEL}`} className="mt-2 inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-gold text-ink font-bold"><Icon name="phone" size={18} /> {PHONE_DISPLAY}</a>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative bg-ink text-white overflow-hidden min-h-[88vh] flex items-end">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${heroPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center 65%' }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl w-full px-4 pb-16 pt-40 md:pb-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-blue font-semibold tracking-[0.2em] uppercase text-xs md:text-sm"><Icon name="pin" size={16} /> {t.hero.kicker}</p>
            <h1 className="mt-4 text-[2.6rem] sm:text-6xl md:text-7xl font-semibold leading-[0.92] uppercase tracking-tight break-words drop-shadow-lg">{t.hero.title}</h1>
            <p className="mt-6 text-lg md:text-xl text-white/85 max-w-xl drop-shadow">{t.hero.sub}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#contact" className="inline-flex items-center justify-center h-13 px-7 rounded-sm bg-gold text-ink font-bold text-lg hover:bg-gold-2">{t.hero.cta1}</a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center justify-center gap-2 h-13 px-7 rounded-sm border-2 border-blue bg-blue/10 font-bold text-lg hover:bg-blue/20"><Icon name="phone" size={18} /> {t.hero.cta3}</a>
              <a href="#services" className="inline-flex items-center justify-center h-13 px-7 rounded-sm border-2 border-white/30 font-bold text-lg hover:border-white">{t.hero.cta2}</a>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-white/80 max-w-md">
              {t.hero.bullets.map((b) => <li key={b} className="flex items-center gap-2"><Icon name="check" size={16} className="text-gold" /> {b}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-mist border-b border-ink/5 text-ink">
        <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-ink/10">
          {t.trust.map(([icon, label]) => (
            <div key={label} className="flex items-center gap-3 md:px-6 md:first:pl-0">
              <span className="grid place-items-center w-9 h-9 rounded-sm bg-blue/15 text-blue shrink-0"><Icon name={icon} size={18} /></span>
              <span className="text-sm font-semibold leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.servicesTitle}</h2>
        <p className="mt-3 text-lg text-ink/70 max-w-2xl">{t.servicesSub}</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.services.map((s) => (
            <article key={s.id} id={s.id} className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-ink cursor-pointer" onClick={() => setActiveService(s)}>
              {serviceImages[s.id] ? (
                <img src={serviceImages[s.id]} alt={s.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="absolute inset-0 grid place-items-center"><Icon name={s.icon} size={40} className="text-white/15" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
              <span className="absolute top-4 left-4 grid place-items-center w-10 h-10 rounded-sm bg-blue/90 text-white backdrop-blur-sm"><Icon name={s.icon} size={20} /></span>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="text-xl font-semibold uppercase leading-tight">{s.title}</h3>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div>
                    {s.priceType === 'from' && <><span className="text-xs uppercase tracking-wider text-white/60">{t.from} </span><span className="display text-2xl font-bold text-gold">{s.price}</span></>}
                    {s.priceType === 'quote' && <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{t.quote}</span>}
                    {s.priceType === 'free' && <span className="text-xs font-semibold uppercase tracking-wider text-gold">{t.freeQuote}</span>}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70 border border-white/30 rounded-sm px-2.5 py-1.5 group-hover:border-gold group-hover:text-gold shrink-0">{t.details}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SERVICE DETAILS MODAL */}
      {activeService && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4" onClick={() => setActiveService(null)}>
          <div className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-sm bg-white p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-sm bg-blue text-white shrink-0"><Icon name={activeService.icon} size={26} /></span>
                <h3 className="text-2xl font-bold leading-tight uppercase">{activeService.title}</h3>
              </div>
              <button onClick={() => setActiveService(null)} aria-label={t.close} className="grid place-items-center w-9 h-9 rounded-sm border border-ink/15 shrink-0 hover:border-ink"><Icon name="x" size={18} /></button>
            </div>
            <p className="mt-4 text-ink/75">{activeService.lead}</p>
            <ul className="mt-4 grid gap-1.5 text-sm">
              {activeService.items.map((i) => <li key={i} className="flex items-start gap-2"><Icon name="check" size={16} className="text-blue mt-0.5 shrink-0" /> {i}</li>)}
            </ul>
            {activeService.note && <p className="mt-4 text-xs text-ink/55 border-t border-ink/10 pt-3">{activeService.note}</p>}
            <a href="#contact" onClick={() => setActiveService(null)} className="mt-5 flex items-center justify-center gap-2 h-12 rounded-sm bg-gold text-ink font-bold hover:bg-gold-2">{t.nav.contact} →</a>
          </div>
        </div>
      )}

      {/* WHY */}
      <section className="bg-mist text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.why.title}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.why.items.map(([h, p], i) => (
              <div key={h}>
                <span className={`grid place-items-center w-11 h-11 rounded-sm text-ink ${i % 2 === 0 ? 'bg-blue text-white' : 'bg-gold'}`}><Icon name={whyIcons[i]} size={24} /></span>
                <h3 className="mt-4 text-xl font-bold uppercase">{h}</h3>
                <p className="mt-2 text-ink/70 text-sm">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.process.title}</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {t.process.steps.map(([h, p], i) => (
            <div key={h} className="relative pl-4 border-l-2 border-blue">
              <span className="display text-5xl font-bold text-blue/20">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 text-lg font-bold uppercase">{h}</h3>
              <p className="mt-1 text-sm text-ink/70">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="bg-mist text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.gallery.title}</h2>
          <p className="mt-3 text-lg text-ink/70 max-w-2xl">{t.gallery.sub}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <button onClick={() => setGalleryFilter('all')} className={`h-9 px-4 rounded-sm text-sm font-semibold border ${galleryFilter === 'all' ? 'bg-gold text-ink border-gold' : 'bg-white border-ink/15 hover:border-gold hover:text-gold-2'}`}>{t.gallery.all}</button>
            {t.gallery.categories.map((c) => (
              <button key={c} onClick={() => setGalleryFilter(c)} className={`h-9 px-4 rounded-sm text-sm font-semibold border ${galleryFilter === c ? 'bg-gold text-ink border-gold' : 'bg-white border-ink/15 hover:border-gold hover:text-gold-2'}`}>{c}</button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-5">
            {shownGallery.map((g) => (
              g.pair ? (
                <div key={g.id} className="rounded-sm overflow-hidden border border-ink/10 bg-white">
                  <div className="grid grid-cols-2">
                    <div className="relative aspect-square">
                      <img src={g.pair.before} alt={`${t.gallery.before} — ${g.cat}`} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t.gallery.before}</span>
                    </div>
                    <div className="relative aspect-square">
                      <img src={g.pair.after} alt={`${t.gallery.after} — ${g.cat}`} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">{t.gallery.after}</span>
                    </div>
                  </div>
                  <p className="px-3 py-2 text-xs font-medium text-ink/60">{g.cat}</p>
                </div>
              ) : (
                <div key={g.id} className="aspect-square rounded-sm border border-dashed border-ink/15 bg-white flex flex-col items-center justify-center gap-2 text-center px-2">
                  <Icon name={g.icon} size={26} className="text-blue/60" />
                  <span className="text-xs font-medium text-ink/50">{g.cat}</span>
                  <span className="text-[11px] text-ink/35">{t.gallery.soon}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.testimonials.title}</h2>
        <p className="mt-3 text-lg text-ink/70 max-w-2xl">{t.testimonials.sub}</p>
        <div className="mt-10 rounded-sm border border-dashed border-ink/15 bg-white p-10 text-center">
          <div className="flex justify-center gap-1 text-blue/30">
            {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={22} />)}
          </div>
          <p className="mt-3 text-ink/60 max-w-md mx-auto">{t.testimonials.empty}</p>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="rounded-sm border border-ink/10 bg-white p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-6 md:items-center">
          <span className="grid place-items-center w-14 h-14 rounded-sm bg-blue text-white shrink-0"><Icon name="shield" size={28} /></span>
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tight">{t.about.title}</h2>
            <p className="mt-2 text-ink/75 max-w-2xl">{t.about.text}</p>
          </div>
        </div>
      </section>

      {/* AREA */}
      <section id="area" className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-sm border border-ink/10 bg-white p-8 md:p-10 flex flex-col md:flex-row gap-6 md:items-center">
          <span className="grid place-items-center w-14 h-14 rounded-sm bg-blue text-white shrink-0"><Icon name="pin" size={30} /></span>
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tight">{t.area.title}</h2>
            <p className="mt-2 text-ink/75">{t.area.text}</p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-mist text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-[1fr_1.2fr] gap-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">{t.contact.title}</h2>
            <p className="mt-4 text-ink/70 text-lg">{t.contact.sub}</p>
            <div className="mt-8 flex flex-col gap-3">
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-3 h-14 px-5 rounded-sm bg-gold text-ink font-bold text-lg hover:bg-gold-2"><Icon name="phone" size={22} /> {t.contact.call} {PHONE_DISPLAY}</a>
              <a href={`sms:${PHONE_SMS}`} className="inline-flex items-center gap-3 h-14 px-5 rounded-sm border-2 border-blue/40 bg-white font-bold text-lg hover:border-blue hover:bg-blue/5"><Icon name="message" size={22} /> {t.contact.text} {PHONE_DISPLAY}</a>
              <a href={`https://wa.me/${PHONE_WA}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 h-14 px-5 rounded-sm border-2 border-blue/40 bg-white font-bold text-lg hover:border-blue hover:bg-blue/5"><Icon name="whatsapp" size={22} /> WhatsApp</a>
            </div>
          </div>
          <QuoteForm t={t.contact} services={t.services} lang={lang} />
        </div>
      </section>

      <footer className="bg-white text-ink/60 text-sm border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row justify-between gap-3">
          <p>© {new Date().getFullYear()} {BUSINESS}. {t.footer.rights}</p>
          <p>Warsaw, Indiana · <a href={`tel:${PHONE_TEL}`} className="hover:text-blue">{PHONE_DISPLAY}</a> · {t.footer.made} <a href="https://sistemaskv.com" className="hover:text-blue">SistemasKV</a></p>
        </div>
      </footer>

      {/* FLOATING CONTACT */}
      <div className="fixed z-30 bottom-5 right-4 md:right-6 flex flex-col gap-3">
        <a href={`https://wa.me/${PHONE_WA}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid place-items-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"><Icon name="whatsapp" size={26} /></a>
        <a href={`tel:${PHONE_TEL}`} aria-label={t.nav.call} className="grid place-items-center w-14 h-14 rounded-full bg-gold text-ink shadow-lg hover:scale-105 transition-transform"><Icon name="phone" size={26} /></a>
      </div>
    </div>
  )
}
