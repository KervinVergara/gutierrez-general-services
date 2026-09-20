import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, FilterBtn, Loading, EmptyState } from './shared'
import { money, fmtDate, todayStr, nextVisitFrom } from './util'

const FREQUENCIES = [
  { id: 'weekly', label: 'Semanal' }, { id: 'biweekly', label: 'Quincenal' }, { id: 'monthly', label: 'Mensual' },
  { id: 'bimonthly', label: 'Cada 2 meses' }, { id: 'quarterly', label: 'Trimestral' },
]
const STATUSES = ['active', 'paused', 'cancelled']
const LABEL = { active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado' }
const COLOR = { active: 'bg-green-100 text-green-900', paused: 'bg-amber-100 text-amber-900', cancelled: 'bg-ink/10 text-ink/60' }
const ALL_SERVICES = content.es.services.filter((s) => !s.hidden)

const emptyForm = { clientId: '', name: '', price: '', frequency: 'monthly', startDate: todayStr(), notes: '', items: [] }

export default function AdminPlans({ goTo, focus, onFocusHandled }) {
  const [plans, setPlans] = useState([])
  const [clients, setClients] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [pick, setPick] = useState('')
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')

  useEffect(() => {
    let u1 = null, u2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      u1 = onSnapshot(query(collection(db, 'plans'), orderBy('nextVisit')), (snap) => {
        setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
      u2 = onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    })
    return () => { u1 && u1(); u2 && u2() }
  }, [])

  useEffect(() => {
    if (!focus?.clientId) return
    setEditingId('new')
    setForm({ ...emptyForm, clientId: focus.clientId })
    onFocusHandled?.()
  }, [focus, onFocusHandled])

  function startNew() { setEditingId('new'); setForm(emptyForm) }
  function cancel() { setEditingId(null); setForm(emptyForm) }

  function addItem() {
    const s = ALL_SERVICES.find((x) => x.id === pick)
    if (!s) return
    setForm((f) => ({ ...f, items: [...f.items, { service: s.title, qty: Number(qty) || 1 }] }))
    setPick('')
    setQty(1)
  }
  function removeItem(i) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  }

  async function save(e) {
    e.preventDefault()
    const c = clients.find((x) => x.id === form.clientId)
    if (!c) { setErr('Selecciona un cliente.'); return }
    setErr('')
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    await addDoc(collection(db, 'plans'), {
      clientId: form.clientId, clientName: c.name || c.phone, name: form.name, price: Number(form.price) || 0,
      frequency: form.frequency, startDate: form.startDate, nextVisit: form.startDate, status: 'active', notes: form.notes,
      items: form.items, createdAt: serverTimestamp(),
    })
    cancel()
  }

  async function setStatus(id, status) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'plans', id), { status })
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este plan? Esta acción no se puede deshacer.')) return
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'plans', id))
  }

  async function generateNext(plan) {
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    await addDoc(collection(db, 'jobs'), {
      clientId: plan.clientId, clientName: plan.clientName, category: '', service: plan.name,
      date: plan.nextVisit, time: '', address: '', amountCharged: plan.price, amountPaid: 0,
      status: 'scheduled', paymentStatus: 'pending', paymentMethod: '', notes: plan.notes || '',
      origin: 'plan', planId: plan.id, createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'plans', plan.id), { nextVisit: nextVisitFrom(plan.nextVisit, plan.frequency) })
    goTo?.('jobs')
  }

  const shown = filter === 'all' ? plans : plans.filter((p) => p.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todos ({plans.length})</FilterBtn>
          {STATUSES.map((s) => <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} ({plans.filter((p) => p.status === s).length})</FilterBtn>)}
        </div>
        <button onClick={startNew} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="plus" size={16} /> Nuevo plan</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {editingId && (
        <form onSubmit={save} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid gap-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Cliente">
              <select required className={inputCls} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
                <option value="">Seleccione un cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} · {c.phone}</option>)}
              </select>
            </Field>
            <Field label="Nombre del plan"><input required className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Mantenimiento mensual" /></Field>
            <Field label="Precio (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="Frecuencia">
              <select className={inputCls} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
                {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Fecha de inicio"><input required type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
          </div>

          <Field label="Incluye">
            <div className="grid gap-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-mist rounded-lg px-3 py-2">
                  <span>{it.qty} × {it.service}</span>
                  <button type="button" onClick={() => removeItem(i)} aria-label="Quitar" className="text-ink/40 hover:text-red-600"><Icon name="trash" size={13} /></button>
                </div>
              ))}
              <div className="flex items-end gap-2">
                <select className={`${inputCls} flex-1`} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Agregar servicio…</option>
                  {ALL_SERVICES.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} w-20`} />
                <button type="button" onClick={addItem} className="h-11 px-4 rounded-lg border border-ink/20 font-bold text-sm shrink-0">Agregar</button>
              </div>
            </div>
          </Field>

          <Field label="Notas"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          <div className="flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
            <button type="button" onClick={cancel} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {!loaded && <Loading />}
      {loaded && shown.length === 0 && <EmptyState title="No hay planes todavía." hint="Crea un plan de mantenimiento recurrente para un cliente." ctaLabel="Nuevo plan" onCta={startNew} />}
      <div className="grid gap-3">
        {shown.map((p) => (
          <article key={p.id} className="rounded-xl bg-white border border-ink/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${COLOR[p.status]}`}>{LABEL[p.status]}</span>
                <span className="text-xs text-ink/50">{FREQUENCIES.find((f) => f.id === p.frequency)?.label}</span>
              </div>
              <p className="mt-1 font-bold text-ink">{p.name} · {p.clientName}</p>
              <p className="text-sm text-ink/70">{money(p.price)} · Próxima visita: {fmtDate(p.nextVisit)}</p>
              {p.items?.length > 0 && <p className="mt-1 text-xs text-ink/50">Incluye: {p.items.map((it) => `${it.qty}× ${it.service}`).join(', ')}</p>}
            </div>
            <div className="flex items-center gap-2">
              {p.status === 'active' && (
                <button onClick={() => generateNext(p)} className="h-9 px-3 rounded-lg bg-gold text-ink text-xs font-bold">Generar próximo servicio</button>
              )}
              <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className="h-9 rounded-lg border border-ink/20 px-2 text-xs bg-white">
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
              <button onClick={() => remove(p.id)} aria-label="Eliminar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
