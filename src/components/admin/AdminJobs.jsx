import { useEffect, useState } from 'react'
import { auth, db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, FilterBtn, Loading, EmptyState } from './shared'
import { money, fmtDate, todayStr, addDaysStr, addMonthsStr, withAudit } from './util'

const SERVICE_TITLES = content.es.services.map((s) => s.title)
const STATUSES = ['scheduled', 'in_progress', 'done', 'cancelled']
const LABEL = { scheduled: 'Agendado', in_progress: 'En progreso', done: 'Terminado', cancelled: 'Cancelado' }
const COLOR = { scheduled: 'bg-purple-100 text-purple-900', in_progress: 'bg-blue-100 text-blue-900', done: 'bg-green-100 text-green-900', cancelled: 'bg-ink/10 text-ink/60' }
const PAY_LABEL = { pending: 'Pendiente', paid: 'Pagado', partial: 'Pago parcial' }
const PAY_COLOR = { pending: 'bg-red-50 text-red-700', paid: 'bg-green-50 text-green-700', partial: 'bg-amber-50 text-amber-700' }
const PAY_METHODS = ['', 'Efectivo', 'Transferencia', 'Tarjeta', 'Otro']
const CATEGORIES = [{ id: '', label: 'Sin categoría' }, { id: 'auto', label: 'Auto' }, { id: 'property', label: 'Property' }, { id: 'seasonal', label: 'Seasonal' }]
const ORIGIN_LABEL = { manual: 'Manual', quote: 'Desde cotización', plan: 'Desde plan' }
const CATEGORY_DOT = { auto: 'bg-blue-500', property: 'bg-green-500', seasonal: 'bg-amber-500' }
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toDateStr(d) { return d.toISOString().slice(0, 10) }
function startOfWeek(d) { const c = new Date(d); const day = (c.getDay() + 6) % 7; c.setDate(c.getDate() - day); return c }

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
  const [view, setView] = useState('list')
  const [calMode, setCalMode] = useState('month')
  const [cursor, setCursor] = useState(new Date())

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
    } else if (focus.clientId) {
      setEditingId('new')
      setForm({ ...emptyForm, clientId: focus.clientId })
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
      await setDoc(ref, withAudit({
        type: 'income', amount: paidAmount, description: `${job.service} — ${job.clientName}`, jobId: job.id, date: job.date,
      }, auth))
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
    const data = withAudit({
      clientId: form.clientId, clientName: c.name || c.phone, category: form.category,
      service: form.service, date: form.date, time: form.time, address: form.address,
      amountCharged: form.amountCharged ? Number(form.amountCharged) : 0,
      status: form.status, paymentStatus: form.paymentStatus,
      amountPaid: form.paymentStatus === 'paid' ? Number(form.amountCharged || 0) : form.paymentStatus === 'partial' ? Number(form.amountPaid || 0) : 0,
      paymentMethod: form.paymentMethod, notes: form.notes, vehicleId: form.vehicleId, propertyId: form.propertyId,
    }, auth)
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
    const { doc, deleteDoc, updateDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'jobs', job.id))
    await deleteDoc(doc(db, 'finance', `job_${job.id}`)).catch(() => {})
    // Un-link the originating quote so it doesn't stay locked pointing at a deleted service.
    if (job.quoteId) {
      await updateDoc(doc(db, 'quotes', job.quoteId), { jobId: null, status: 'accepted' }).catch(() => {})
    }
  }

  async function saveNextService(job, next) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'jobs', job.id), withAudit({ nextService: next }, auth))
    setNextFor(null)
  }

  function jobsOn(dateStr) { return jobs.filter((j) => j.date === dateStr && j.status !== 'cancelled').sort((a, b) => (a.time || '').localeCompare(b.time || '')) }
  function openJobId(id) { const j = jobs.find((x) => x.id === id); if (j) startEdit(j) }
  function createJobAt(dateStr) { setEditingId('new'); setForm({ ...emptyForm, date: dateStr }) }
  function shiftCursor(delta) {
    const c = new Date(cursor)
    if (calMode === 'month') c.setMonth(c.getMonth() + delta)
    else c.setDate(c.getDate() + delta * 7)
    setCursor(c)
  }

  const shown = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)
  const monthLabel = cursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterBtn active={view === 'list'} onClick={() => setView('list')}>Lista</FilterBtn>
          <FilterBtn active={view === 'calendar'} onClick={() => setView('calendar')}>Calendario</FilterBtn>
          {view === 'list' && <span className="w-px h-6 bg-ink/10 mx-1" />}
          {view === 'list' && (
            <>
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todos ({jobs.length})</FilterBtn>
              {STATUSES.map((s) => <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} ({jobs.filter((j) => j.status === s).length})</FilterBtn>)}
            </>
          )}
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

      {view === 'list' && (
        <>
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
        </>
      )}

      {view === 'calendar' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FilterBtn active={calMode === 'month'} onClick={() => setCalMode('month')}>Mensual</FilterBtn>
              <FilterBtn active={calMode === 'week'} onClick={() => setCalMode('week')}>Semanal</FilterBtn>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => shiftCursor(-1)} aria-label="Anterior" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink">‹</button>
              <p className="font-bold text-ink capitalize w-40 text-center">{calMode === 'month' ? monthLabel : `Semana del ${toDateStr(startOfWeek(cursor)).slice(5)}`}</p>
              <button onClick={() => shiftCursor(1)} aria-label="Siguiente" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink">›</button>
              <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-lg border border-ink/15 text-xs font-bold hover:border-ink">Hoy</button>
            </div>
          </div>
          {calMode === 'month'
            ? <MonthGrid cursor={cursor} jobsOn={jobsOn} openJob={openJobId} createJobAt={createJobAt} />
            : <WeekList cursor={cursor} jobsOn={jobsOn} openJob={openJobId} createJobAt={createJobAt} />}
        </div>
      )}
    </div>
  )
}

function MonthGrid({ cursor, jobsOn, openJob, createJobAt }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const today = todayStr()
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate() + i); return d })

  return (
    <div className="rounded-2xl bg-white border border-ink/10 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink/10 bg-mist">
        {WEEKDAYS.map((w) => <div key={w} className="p-2 text-center text-xs font-bold text-ink/60">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dateStr = toDateStr(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const dayJobs = jobsOn(dateStr)
          return (
            <div key={dateStr} className={`min-h-[92px] border-b border-r border-ink/5 p-1.5 ${inMonth ? '' : 'bg-sand/40'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${dateStr === today ? 'bg-gold text-ink rounded-full w-5 h-5 grid place-items-center' : inMonth ? 'text-ink/70' : 'text-ink/30'}`}>{d.getDate()}</span>
                <button onClick={() => createJobAt?.(dateStr)} aria-label="Agregar" className="text-ink/30 hover:text-ink"><Icon name="plus" size={12} /></button>
              </div>
              <div className="mt-1 grid gap-0.5">
                {dayJobs.slice(0, 3).map((j) => (
                  <button key={j.id} onClick={() => openJob?.(j.id)} className="w-full text-left text-[10px] leading-tight bg-mist rounded px-1 py-0.5 flex items-center gap-1 hover:bg-ink/10 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_DOT[j.category] || 'bg-ink/40'}`} />
                    <span className="truncate">{j.time && `${j.time} `}{j.clientName}</span>
                  </button>
                ))}
                {dayJobs.length > 3 && <span className="text-[10px] text-ink/40 px-1">+{dayJobs.length - 3} más</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekList({ cursor, jobsOn, openJob, createJobAt }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  const today = todayStr()

  return (
    <div className="grid sm:grid-cols-7 gap-2">
      {days.map((d) => {
        const dateStr = toDateStr(d)
        const dayJobs = jobsOn(dateStr)
        return (
          <div key={dateStr} className={`rounded-xl border p-2.5 ${dateStr === today ? 'border-gold bg-gold/10' : 'border-ink/10 bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-ink/70">{WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}</p>
              <button onClick={() => createJobAt?.(dateStr)} aria-label="Agregar" className="text-ink/30 hover:text-ink"><Icon name="plus" size={13} /></button>
            </div>
            <div className="grid gap-1">
              {dayJobs.length === 0 && <p className="text-[11px] text-ink/40">Sin servicios</p>}
              {dayJobs.map((j) => (
                <button key={j.id} onClick={() => openJob?.(j.id)} className="w-full text-left text-xs bg-mist rounded px-2 py-1.5 hover:bg-ink/10">
                  <span className="font-bold">{j.time || '—'}</span> · {j.clientName}
                  <p className="text-[10px] text-ink/50 truncate">{j.service}</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}
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
