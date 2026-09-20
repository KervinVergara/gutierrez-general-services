import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, FilterBtn, Loading, EmptyState } from './shared'
import { money, fmtDate, todayStr, addDaysStr, addMonthsStr } from './util'

const SERVICE_TITLES = content.es.services.map((s) => s.title)
const STATUSES = ['scheduled', 'in_progress', 'done', 'cancelled']
const LABEL = { scheduled: 'Agendado', in_progress: 'En progreso', done: 'Terminado', cancelled: 'Cancelado' }
const COLOR = { scheduled: 'bg-purple-100 text-purple-900', in_progress: 'bg-blue-100 text-blue-900', done: 'bg-green-100 text-green-900', cancelled: 'bg-ink/10 text-ink/60' }
const PAY_LABEL = { pending: 'Pendiente', paid: 'Pagado', partial: 'Pago parcial' }
const PAY_COLOR = { pending: 'bg-red-50 text-red-700', paid: 'bg-green-50 text-green-700', partial: 'bg-amber-50 text-amber-700' }
const PAY_METHODS = ['', 'Efectivo', 'Transferencia', 'Tarjeta', 'Otro']
const CATEGORIES = [{ id: '', label: 'Sin categoría' }, { id: 'auto', label: 'Auto' }, { id: 'property', label: 'Property' }, { id: 'seasonal', label: 'Seasonal' }]
const ORIGIN_LABEL = { manual: 'Manual', quote: 'Desde cotización', plan: 'Desde plan' }

const emptyForm = {
  clientId: '', category: '', service: SERVICE_TITLES[0] || '', date: todayStr(), time: '', address: '',
  amountCharged: '', status: 'done', paymentStatus: 'pending', amountPaid: '', paymentMethod: '', notes: '',
  vehicleId: '', propertyId: '',
}

export default function AdminJobs({ focus, onFocusHandled }) {
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [nextFor, setNextFor] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub1 = null, unsub2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub1 = onSnapshot(query(collection(db, 'jobs'), orderBy('date', 'desc')), (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
      unsub2 = onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { unsub1 && unsub1(); unsub2 && unsub2() }
  }, [])

  useEffect(() => {
    if (!focus) return
    if (focus.id) {
      const j = jobs.find((x) => x.id === focus.id)
      if (j) { startEdit(j); onFocusHandled?.() }
      else if (loaded) { onFocusHandled?.() } // genuinely not found — give up instead of retrying forever
      // otherwise jobs hasn't loaded yet — wait for the next snapshot instead of clearing focus early
    } else if (focus.prefillDate) {
      setEditingId('new')
      setForm({ ...emptyForm, date: focus.prefillDate })
      onFocusHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, jobs, loaded])

  const client = clients.find((c) => c.id === form.clientId)

  async function syncFinance(job) {
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore')
    const ref = doc(db, 'finance', `job_${job.id}`)
    const paidAmount = job.paymentStatus === 'paid' ? Number(job.amountCharged) : job.paymentStatus === 'partial' ? Number(job.amountPaid) : 0
    if (paidAmount > 0) {
      await setDoc(ref, {
        type: 'income', amount: paidAmount, description: `${job.service} — ${job.clientName}`, jobId: job.id, date: job.date,
      })
    } else {
      await deleteDoc(ref).catch(() => {})
    }
  }

  function startNew() { setEditingId('new'); setForm(emptyForm) }
  function startEdit(j) {
    setEditingId(j.id)
    setForm({
      clientId: j.clientId, category: j.category || '', service: j.service, date: j.date, time: j.time || '', address: j.address || '',
      amountCharged: j.amountCharged ?? '', status: j.status, paymentStatus: j.paymentStatus || 'pending', amountPaid: j.amountPaid ?? '',
      paymentMethod: j.paymentMethod || '', notes: j.notes || '', vehicleId: j.vehicleId || '', propertyId: j.propertyId || '',
    })
  }
  function cancel() { setEditingId(null); setForm(emptyForm) }

  async function save(e) {
    e.preventDefault()
    const c = clients.find((x) => x.id === form.clientId)
    if (!c) { setErr('Selecciona un cliente.'); return }
    setErr('')
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    const data = {
      clientId: form.clientId, clientName: c.name || c.phone, category: form.category,
      service: form.service, date: form.date, time: form.time, address: form.address,
      amountCharged: form.amountCharged ? Number(form.amountCharged) : 0,
      status: form.status, paymentStatus: form.paymentStatus,
      amountPaid: form.paymentStatus === 'paid' ? Number(form.amountCharged || 0) : form.paymentStatus === 'partial' ? Number(form.amountPaid || 0) : 0,
      paymentMethod: form.paymentMethod, notes: form.notes, vehicleId: form.vehicleId, propertyId: form.propertyId,
    }
    let id = editingId
    if (editingId === 'new') {
      const ref = await addDoc(collection(db, 'jobs'), { ...data, origin: 'manual', createdAt: serverTimestamp() })
      id = ref.id
    } else {
      await updateDoc(doc(db, 'jobs', editingId), data)
    }
    await syncFinance({ ...data, id })
    cancel()
  }

  async function remove(job) {
    if (!confirm(`¿Eliminar el servicio de ${job.clientName}? Esta acción no se puede deshacer.`)) return
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'jobs', job.id))
    await deleteDoc(doc(db, 'finance', `job_${job.id}`)).catch(() => {})
  }

  async function saveNextService(job, next) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'jobs', job.id), { nextService: next })
    setNextFor(null)
  }

  const shown = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todos ({jobs.length})</FilterBtn>
          {STATUSES.map((s) => <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} ({jobs.filter((j) => j.status === s).length})</FilterBtn>)}
        </div>
        <button onClick={startNew} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="plus" size={16} /> Nuevo servicio</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {editingId && (
        <form onSubmit={save} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid sm:grid-cols-2 gap-3">
          <Field label="Cliente">
            <select required className={inputCls} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, vehicleId: '', propertyId: '' }))}>
              <option value="">Seleccione un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} · {c.phone}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          {client?.vehicles?.length > 0 && (
            <Field label="Vehículo">
              <select className={inputCls} value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                <option value="">— Ninguno —</option>
                {client.vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year}</option>)}
              </select>
            </Field>
          )}
          {client?.properties?.length > 0 && (
            <Field label="Propiedad">
              <select className={inputCls} value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))}>
                <option value="">— Ninguna —</option>
                {client.properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </Field>
          )}
          <Field label="Servicio">
            <select className={inputCls} value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}>
              {SERVICE_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Hora"><input type="time" className={inputCls} value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></Field>
          <Field label="Dirección"><input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
          <Field label="Precio (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={form.amountCharged} onChange={(e) => setForm((f) => ({ ...f, amountCharged: e.target.value }))} /></Field>
          <Field label="Estado">
            <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Estado del pago">
            <select className={inputCls} value={form.paymentStatus} onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}>
              {Object.keys(PAY_LABEL).map((s) => <option key={s} value={s}>{PAY_LABEL[s]}</option>)}
            </select>
          </Field>
          {form.paymentStatus === 'partial' && (
            <Field label="Monto pagado (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={form.amountPaid} onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))} /></Field>
          )}
          <Field label="Método de pago">
            <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
              {PAY_METHODS.map((m) => <option key={m} value={m}>{m || '— Sin especificar —'}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notas"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
            <button type="button" onClick={cancel} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {!loaded && <Loading />}
      {loaded && shown.length === 0 && <EmptyState title="No hay servicios en esta vista." hint="Crea un servicio o convierte una cotización aceptada." ctaLabel="Nuevo servicio" onCta={startNew} />}
      <div className="grid gap-3">
        {shown.map((j) => (
          <article key={j.id} className="rounded-xl bg-white border border-ink/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${COLOR[j.status] || COLOR.scheduled}`}>{LABEL[j.status] || j.status}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${PAY_COLOR[j.paymentStatus] || PAY_COLOR.pending}`}>{PAY_LABEL[j.paymentStatus] || 'Pendiente'}</span>
                  <span className="text-xs text-ink/50">{fmtDate(j.date)}{j.time && ` · ${j.time}`}</span>
                  {j.origin && j.origin !== 'manual' && <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{ORIGIN_LABEL[j.origin]}</span>}
                </div>
                <p className="mt-1 font-bold text-ink">{j.service}</p>
                <p className="text-sm text-ink/70">{j.clientName}{j.address && ` · ${j.address}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-ink">{money(j.amountCharged)}</span>
                <button onClick={() => startEdit(j)} aria-label="Editar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink"><Icon name="tag" size={14} /></button>
                <button onClick={() => remove(j)} aria-label="Eliminar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={14} /></button>
              </div>
            </div>
            {j.status === 'done' && (
              <div className="mt-3 border-t border-ink/10 pt-3">
                {j.nextService?.dueDate ? (
                  <p className="text-sm text-ink/60">Próximo mantenimiento sugerido: <strong className="text-ink">{fmtDate(j.nextService.dueDate)}</strong> <button onClick={() => saveNextService(j, null)} className="ml-2 text-xs underline">Quitar</button></p>
                ) : nextFor === j.id ? (
                  <NextServiceForm job={j} onSave={(n) => saveNextService(j, n)} onCancel={() => setNextFor(null)} />
                ) : (
                  <button onClick={() => setNextFor(j.id)} className="text-sm font-bold text-ink hover:underline">+ Definir próximo mantenimiento</button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function NextServiceForm({ job, onSave, onCancel }) {
  const [mode, setMode] = useState('weeks')
  const [value, setValue] = useState(4)
  const [date, setDate] = useState('')

  function submit(e) {
    e.preventDefault()
    let dueDate = date
    if (mode === 'weeks') dueDate = addDaysStr(job.date, Number(value) * 7)
    if (mode === 'months') dueDate = addMonthsStr(job.date, Number(value))
    onSave({ mode, value: mode === 'date' ? null : Number(value), dueDate })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="weeks">En X semanas</option>
        <option value="months">En X meses</option>
        <option value="date">Fecha específica</option>
      </select>
      {mode === 'date' ? (
        <input type="date" required className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      ) : (
        <input type="number" min="1" className={`${inputCls} w-24`} value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      <button className="h-11 px-4 rounded-lg bg-gold text-ink font-bold text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="h-11 px-4 rounded-lg border border-ink/20 font-bold text-sm">Cancelar</button>
    </form>
  )
}
