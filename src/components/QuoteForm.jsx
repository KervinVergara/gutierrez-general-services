import { useEffect, useState } from 'react'
import { db, isConfigured } from '../firebase'
import { PHONE_DISPLAY, PHONE_TEL, PHONE_WA } from '../content'
import Icon from './Icon'

const initialForm = { type: '', name: '', phone: '', email: '', zip: '', service: '', vehicle: '', message: '', consent: false }

function waLink(form, serviceName) {
  const lines = [
    `Quote request — ${form.name}`,
    `Phone: ${form.phone}`,
    form.email && `Email: ${form.email}`,
    form.zip && `ZIP/Address: ${form.zip}`,
    `Service: ${serviceName}`,
    form.vehicle && `Vehicle/equipment: ${form.vehicle}`,
    form.message && `Details: ${form.message}`,
  ].filter(Boolean)
  return `https://wa.me/${PHONE_WA}?text=${encodeURIComponent(lines.join('\n'))}`
}

export default function QuoteForm({ t, services, lang, presetService, presetType, id }) {
  const [state, setState] = useState('idle') // idle | sending | ok | err
  const [form, setForm] = useState(initialForm)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const selected = services.find((s) => s.id === form.service)
  const serviceName = selected?.title || form.service

  const shownServices = services.filter((s) => {
    if (form.type === 'vehicle') return s.group === 'auto'
    if (form.type === 'home') return s.group === 'property' || s.group === 'seasonal'
    return true
  })

  useEffect(() => {
    if (presetType || presetService) {
      setForm((f) => ({ ...f, type: presetType || f.type, service: presetService || f.service }))
      setState('idle')
    }
  }, [presetType, presetService])

  async function submit(e) {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    try {
      if (!isConfigured) throw new Error('Firebase not configured')
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
      const { consent, ...data } = form
      if (!data.vehicle) delete data.vehicle
      if (!data.email) delete data.email
      await addDoc(collection(db, 'quotes'), {
        ...data,
        lang,
        status: 'new',
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      })
      setState('ok')
    } catch (err) {
      console.error(err)
      setState('err')
    }
  }

  if (state === 'ok') {
    return (
      <div id={id} className="rounded-2xl bg-white text-ink p-8 grid gap-4 text-center">
        <p className="text-xl font-semibold">{t.ok}</p>
        <div className="border-t border-ink/10 pt-4">
          <p className="text-sm text-steel">{t.okWa}</p>
          <a href={waLink(form, serviceName)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gold text-ink font-bold hover:bg-gold-2">{t.waBtn}</a>
        </div>
      </div>
    )
  }

  const input = 'w-full h-13 rounded-xl bg-white text-ink text-base px-4 border border-ink/15 placeholder:text-steel/70 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold'
  const typeOptions = [
    { id: 'vehicle', label: t.typeVehicle, icon: 'car' },
    { id: 'home', label: t.typeHome, icon: 'home' },
    { id: 'both', label: t.typeBoth, icon: 'both' },
  ]

  return (
    <form id={id} onSubmit={submit} noValidate className="rounded-2xl bg-white p-6 md:p-7 grid gap-4 shadow-[0_18px_40px_-20px_rgba(18,59,85,0.35)]">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-ink">{t.typeLabel}</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {typeOptions.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: o.id }))}
              aria-pressed={form.type === o.id}
              className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition-colors ${form.type === o.id ? 'border-gold bg-gold/15 text-ink' : 'border-ink/15 text-ink/70 hover:border-ink/30'}`}
            >
              <Icon name={o.icon} size={20} />
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      {form.type && (
        <>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
            {t.service}
            <select required className={input} value={form.service} onChange={set('service')}>
              <option value="">{t.select}</option>
              {shownServices.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>

          {selected?.group === 'auto' && (
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
              {t.vehicle}
              <input className={input} value={form.vehicle} onChange={set('vehicle')} />
            </label>
          )}

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
            {t.zip}
            <input className={input} value={form.zip} onChange={set('zip')} />
          </label>

          <p className="text-xs text-steel">{t.photosNote}</p>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
              {t.name}
              <input required className={input} value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
              {t.phone}
              <input required type="tel" className={input} value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
          </div>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
            {t.email}
            <input type="email" className={input} value={form.email} onChange={set('email')} autoComplete="email" />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-steel">
            {t.message}
            <textarea rows="3" className="w-full rounded-xl bg-white text-ink text-base px-4 py-3 border border-ink/15 placeholder:text-steel/70 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold" value={form.message} onChange={set('message')} />
          </label>

          <label className="flex items-start gap-2.5 text-xs text-ink/60">
            <input required type="checkbox" className="mt-0.5 w-4 h-4 accent-[var(--color-gold)]" checked={form.consent} onChange={set('consent')} />
            {t.consent}
          </label>

          {state === 'err' && (
            <p role="alert" className="text-sm font-medium text-red-600">{t.err} <a className="underline font-bold" href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>.</p>
          )}

          <button disabled={state === 'sending'} aria-busy={state === 'sending'} className="h-14 rounded-full bg-gold text-ink font-bold text-lg hover:bg-gold-2 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {state === 'sending' ? t.sending : t.send}
          </button>
        </>
      )}
    </form>
  )
}
