import { useState } from 'react'
import { db, isConfigured } from '../firebase'
import { PHONE_DISPLAY, PHONE_TEL, PHONE_WA } from '../content'
import Icon from './Icon'

const initialForm = { name: '', phone: '', city: '', service: '', vehicle: '', date: '', message: '', consent: false }

function waLink(form, serviceName) {
  const lines = [
    `Quote request — ${form.name}`,
    `Phone: ${form.phone}`,
    form.city && `City: ${form.city}`,
    `Service: ${serviceName}`,
    form.vehicle && `Vehicle/equipment: ${form.vehicle}`,
    form.date && `Preferred date: ${form.date}`,
    form.message && `Notes: ${form.message}`,
  ].filter(Boolean)
  return `https://wa.me/${PHONE_WA}?text=${encodeURIComponent(lines.join('\n'))}`
}

export default function QuoteForm({ t, services, lang }) {
  const [state, setState] = useState('idle') // idle | sending | ok | err
  const [form, setForm] = useState(initialForm)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const serviceName = services.find((s) => s.id === form.service)?.title || form.service

  async function submit(e) {
    e.preventDefault()
    setState('sending')
    try {
      if (!isConfigured) throw new Error('Firebase not configured')
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
      const { consent, ...data } = form
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
      <div className="rounded-sm bg-white text-ink p-8 grid gap-4 text-center">
        <p className="text-xl font-semibold">{t.ok}</p>
        <div className="border-t border-ink/10 pt-4">
          <p className="text-sm text-ink/70">{t.okWa}</p>
          <a href={waLink(form, serviceName)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-sm bg-gold text-ink font-bold hover:bg-gold-2">{t.waBtn}</a>
        </div>
      </div>
    )
  }

  const input = 'w-full h-12 rounded-sm bg-white text-ink pl-10 pr-4 border border-ink/15 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue'
  const plainInput = 'w-full h-12 rounded-sm bg-white text-ink px-4 border border-ink/15 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue'
  const iconWrap = 'relative'
  const iconStyle = 'pointer-events-none absolute left-3 top-[34px] text-ink/40'

  return (
    <form onSubmit={submit} className="rounded-sm bg-white border border-ink/10 shadow-sm p-6 md:p-8 grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={`grid gap-1.5 text-sm font-medium ${iconWrap}`}>{t.name}<Icon name="hand" size={16} className={iconStyle} /><input required className={input} value={form.name} onChange={set('name')} autoComplete="name" /></label>
        <label className={`grid gap-1.5 text-sm font-medium ${iconWrap}`}>{t.phone}<Icon name="phone" size={16} className={iconStyle} /><input required type="tel" className={input} value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={`grid gap-1.5 text-sm font-medium ${iconWrap}`}>{t.city}<Icon name="pin" size={16} className={iconStyle} /><input className={input} value={form.city} onChange={set('city')} autoComplete="address-level2" /></label>
        <label className="grid gap-1.5 text-sm font-medium">{t.service}
          <select required className={plainInput} value={form.service} onChange={set('service')}>
            <option value="">{t.select}</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="grid gap-1.5 text-sm font-medium">{t.vehicle}<input className={plainInput} value={form.vehicle} onChange={set('vehicle')} /></label>
        <label className="grid gap-1.5 text-sm font-medium">{t.date}<input type="date" className={plainInput} value={form.date} onChange={set('date')} /></label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">{t.message}<textarea rows="3" className="w-full rounded-sm bg-white text-ink px-4 py-3 border border-ink/15 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue" value={form.message} onChange={set('message')} /></label>
      <label className="flex items-start gap-2.5 text-sm text-ink/70">
        <input required type="checkbox" className="mt-0.5 w-4 h-4 accent-[var(--color-gold)]" checked={form.consent} onChange={set('consent')} />
        {t.consent}
      </label>
      {state === 'err' && (
        <p className="text-sm text-gold">{t.err} <a className="underline font-bold" href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>.</p>
      )}
      <button disabled={state === 'sending'} className="h-13 rounded-sm bg-gold text-ink font-bold text-lg hover:bg-gold-2 disabled:opacity-60">
        {state === 'sending' ? t.sending : t.send}
      </button>
    </form>
  )
}
