import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { FilterBtn, Field, inputCls, Loading, EmptyState } from './shared'
import { sanitizePhone, money, todayStr } from './util'

const STATUSES = ['new', 'contacted', 'quoted', 'accepted', 'scheduled', 'done', 'lost']
const LABEL = { new: 'Nuevo', contacted: 'Contactado', quoted: 'Cotizado', accepted: 'Aceptado', scheduled: 'Agendado', done: 'Terminado', lost: 'Perdido' }
const COLOR = {
  new: 'bg-gold text-ink', contacted: 'bg-blue-100 text-blue-900', quoted: 'bg-indigo-100 text-indigo-900', accepted: 'bg-teal-100 text-teal-900',
  scheduled: 'bg-purple-100 text-purple-900', done: 'bg-green-100 text-green-900', lost: 'bg-ink/10 text-ink/60',
}
const CATEGORIES = [{ id: 'auto', label: 'Auto' }, { id: 'property', label: 'Property' }, { id: 'seasonal', label: 'Seasonal' }]
const ALL_SERVICES = content.es.services.filter((s) => !s.hidden)
const serviceName = (id) => content.es.services.find((s) => s.id === id)?.title || id || '—'
const emptyManual = { name: '', phone: '', email: '', zip: '', category: '', service: '', message: '' }

export default function AdminQuotes({ goTo, focus, onFocusHandled }) {
  const [quotes, setQuotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [creating, setCreating] = useState(false)
  const [manual, setManual] = useState(emptyManual)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub = onSnapshot(query(collection(db, 'quotes'), orderBy('createdAt', 'desc')), (snap) => {
        setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
    })
    return () => unsub && unsub()
  }, [])

  useEffect(() => {
    if (!focus || !loaded) return
    if (focus.quoteId) {
      setFilter('all')
      setExpanded(focus.quoteId)
    } else if (focus.newQuoteFor) {
      setManual({ ...emptyManual, ...focus.newQuoteFor })
      setCreating(true)
    }
    onFocusHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, loaded])

  async function setStatus(q, status) {
    if (q.jobId) return // locked — a converted quote's lifecycle is managed through its service
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    await updateDoc(doc(db, 'quotes', q.id), { status, updatedAt: serverTimestamp() })
  }

  async function saveDetails(id, fields) {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    await updateDoc(doc(db, 'quotes', id), { ...fields, updatedAt: serverTimestamp() })
    setExpanded(null)
  }

  async function createManual(e) {
    e.preventDefault()
    if (!manual.name || !manual.phone) { setErr('Nombre y teléfono son obligatorios.'); return }
    setErr('')
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    await addDoc(collection(db, 'quotes'), {
      name: manual.name, phone: manual.phone, email: manual.email, zip: manual.zip,
      category: manual.category, service: manual.service, message: manual.message,
      lang: 'es', status: 'new', origin: 'manual', createdAt: serverTimestamp(),
    })
    setManual(emptyManual)
    setCreating(false)
  }

  async function convertToJob(q) {
    if (q.jobId) return // already converted — never create a second job for the same quote
    setErr('')
    try {
      const { collection, doc, addDoc, updateDoc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const clientId = sanitizePhone(q.phone)
      if (!clientId) { setErr('Esta cotización no tiene un teléfono válido.'); return }
      const clientRef = doc(db, 'clients', clientId)
      const existing = await getDoc(clientRef)
      const clientData = {
        name: q.name || existing.data()?.name || '', phone: q.phone,
        email: q.email || existing.data()?.email || '', zip: q.zip || existing.data()?.zip || '',
        updatedAt: serverTimestamp(),
      }
      if (!existing.exists()) { clientData.createdAt = serverTimestamp(); clientData.source = 'quote'; clientData.vehicles = []; clientData.properties = [] }
      await setDoc(clientRef, clientData, { merge: true })

      const jobRef = await addDoc(collection(db, 'jobs'), {
        clientId, clientName: clientData.name || q.name || q.phone,
        category: q.category || '', service: serviceName(q.service) !== '—' ? serviceName(q.service) : (q.service || ''),
        date: q.preferredDate || todayStr(), time: '', address: q.zip || '',
        amountCharged: Number(q.finalPrice || q.estimatedPrice || 0), amountPaid: 0,
        status: 'scheduled', paymentStatus: 'pending', paymentMethod: '',
        notes: q.message || q.description || '', origin: 'quote', quoteId: q.id,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'quotes', q.id), { status: 'scheduled', jobId: jobRef.id, updatedAt: serverTimestamp() })
    } catch (e) {
      setErr(e.message)
    }
  }

  const shown = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const counts = Object.fromEntries(STATUSES.map((s) => [s, quotes.filter((q) => q.status === s).length]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todas ({quotes.length})</FilterBtn>
          {STATUSES.map((s) => <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} ({counts[s]})</FilterBtn>)}
        </div>
        <button onClick={() => { setCreating(!creating); setManual(emptyManual) }} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold shrink-0"><Icon name="plus" size={16} /> Nueva cotización</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {creating && (
        <form onSubmit={createManual} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid sm:grid-cols-2 gap-3">
          <Field label="Nombre"><input required className={inputCls} value={manual.name} onChange={(e) => setManual((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Teléfono"><input required className={inputCls} value={manual.phone} onChange={(e) => setManual((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Correo"><input className={inputCls} value={manual.email} onChange={(e) => setManual((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Dirección / ZIP"><input className={inputCls} value={manual.zip} onChange={(e) => setManual((f) => ({ ...f, zip: e.target.value }))} /></Field>
          <Field label="Categoría">
            <select className={inputCls} value={manual.category} onChange={(e) => setManual((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Servicio">
            <select className={inputCls} value={manual.service} onChange={(e) => setManual((f) => ({ ...f, service: e.target.value }))}>
              <option value="">Seleccione un servicio</option>
              {ALL_SERVICES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Mensaje"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={manual.message} onChange={(e) => setManual((f) => ({ ...f, message: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
            <button type="button" onClick={() => setCreating(false)} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {!loaded && <Loading />}
      {loaded && shown.length === 0 && <EmptyState title="No hay cotizaciones en esta vista." hint="Las cotizaciones del sitio web aparecen aquí automáticamente." />}
      <div className="grid gap-4">
        {shown.map((q) => (
          <article key={q.id} className="rounded-2xl bg-white border border-ink/10 p-5">
            <div className="grid md:grid-cols-[1fr_auto] gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${COLOR[q.status] || COLOR.new}`}>{LABEL[q.status] || q.status}</span>
                  <span className="text-xs text-ink/50">{q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString('es-CO') : '—'} · {q.lang?.toUpperCase() || 'ES'}</span>
                  {q.category && <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40 bg-mist rounded-full px-2 py-0.5">{q.category}</span>}
                </div>
                <h2 className="mt-2 text-2xl font-bold">{q.name}</h2>
                <p className="text-ink/80"><span className="font-semibold">{serviceName(q.service)}</span>{q.vehicle && ` · ${q.vehicle}`}{q.zip && ` · ${q.zip}`}{q.email && ` · ${q.email}`}</p>
                {q.message && <p className="mt-2 text-sm text-ink/70 whitespace-pre-line">{q.message}</p>}
                {(q.estimatedPrice || q.finalPrice) && (
                  <p className="mt-2 text-sm font-bold text-ink">{q.finalPrice ? `Precio final: ${money(q.finalPrice)}` : `Estimado: ${money(q.estimatedPrice)}`}</p>
                )}
                {q.internalNotes && <p className="mt-1 text-xs text-ink/50 italic">Nota interna: {q.internalNotes}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${q.phone}`} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="phone" size={16} /> {q.phone}</a>
                  <a href={`sms:${q.phone}`} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-ink/20 text-sm font-bold"><Icon name="message" size={16} /> SMS</a>
                  {!q.jobId && <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-ink/20 text-sm font-bold hover:border-ink">{expanded === q.id ? 'Cerrar detalles' : 'Editar detalles'}</button>}
                  {q.status === 'accepted' && !q.jobId && (
                    <button onClick={() => convertToJob(q)} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-gold text-ink text-sm font-bold"><Icon name="arrowRight" size={15} /> Convertir en servicio</button>
                  )}
                  {q.jobId && (
                    <button onClick={() => goTo?.('jobs', { id: q.jobId })} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-green-50 text-green-800 text-sm font-bold hover:bg-green-100"><Icon name="arrowRight" size={15} /> Ver servicio</button>
                  )}
                </div>
              </div>
              <label className="text-sm font-medium grid gap-1 self-start">Estado
                <select value={q.status || 'new'} disabled={!!q.jobId} onChange={(e) => setStatus(q, e.target.value)} className="h-10 rounded-lg border border-ink/20 px-3 bg-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
                {q.jobId && <span className="text-[10px] text-ink/40">Vinculada a un servicio</span>}
              </label>
            </div>
            {expanded === q.id && !q.jobId && <QuoteDetailForm q={q} onSave={(fields) => saveDetails(q.id, fields)} onCancel={() => setExpanded(null)} />}
          </article>
        ))}
      </div>
    </div>
  )
}

function QuoteDetailForm({ q, onSave, onCancel }) {
  const [category, setCategory] = useState(q.category || '')
  const [description, setDescription] = useState(q.description || '')
  const [preferredDate, setPreferredDate] = useState(q.preferredDate || '')
  const [estimatedPrice, setEstimatedPrice] = useState(q.estimatedPrice ?? '')
  const [finalPrice, setFinalPrice] = useState(q.finalPrice ?? '')
  const [internalNotes, setInternalNotes] = useState(q.internalNotes || '')

  function submit(e) {
    e.preventDefault()
    onSave({
      category, description, preferredDate,
      estimatedPrice: estimatedPrice === '' ? null : Number(estimatedPrice),
      finalPrice: finalPrice === '' ? null : Number(finalPrice),
      internalNotes,
    })
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-ink/10 pt-4 grid sm:grid-cols-2 gap-3">
      <Field label="Categoría">
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Sin categoría</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Fecha preferida"><input type="date" className={inputCls} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} /></Field>
      <Field label="Precio estimado (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} /></Field>
      <Field label="Precio final (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Descripción"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
      <div className="sm:col-span-2"><Field label="Notas internas"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} /></Field></div>
      <div className="sm:col-span-2 flex gap-2">
        <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
        <button type="button" onClick={onCancel} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
      </div>
    </form>
  )
}
