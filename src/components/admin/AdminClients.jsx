import { useEffect, useState } from 'react'
import { auth, db } from '../../firebase'
import Icon from '../Icon'
import { Field, inputCls, Loading, EmptyState } from './shared'
import { sanitizePhone, money, fmtDate, todayStr, withAudit } from './util'

const emptyForm = { name: '', phone: '', email: '', zip: '', notes: '' }
const emptyVehicle = { make: '', model: '', year: '', color: '', plate: '', notes: '' }
const emptyProperty = { address: '', type: '', notes: '' }
const uid = () => Math.random().toString(36).slice(2, 10)

export default function AdminClients({ goTo, focus, onFocusHandled }) {
  const [clients, setClients] = useState([])
  const [jobs, setJobs] = useState([])
  const [quotes, setQuotes] = useState([])
  const [plans, setPlans] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let u1 = null, u2 = null, u3 = null, u4 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      u1 = onSnapshot(query(collection(db, 'clients'), orderBy('updatedAt', 'desc')), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
      u2 = onSnapshot(collection(db, 'jobs'), (snap) => setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      u3 = onSnapshot(collection(db, 'quotes'), (snap) => setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      u4 = onSnapshot(collection(db, 'plans'), (snap) => setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    })
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4() }
  }, [])

  useEffect(() => {
    if (!focus?.clientId) return
    setOpen(focus.clientId)
    onFocusHandled?.()
  }, [focus, onFocusHandled])

  function jobsFor(c) { return jobs.filter((j) => j.clientId === c.id) }
  function quotesFor(c) { return quotes.filter((q) => sanitizePhone(q.phone) === c.id) }
  function activePlanFor(c) { return plans.find((p) => p.clientId === c.id && p.status === 'active') }

  function summaryFor(c) {
    const cjobs = jobsFor(c)
    const done = cjobs.filter((j) => j.status === 'done')
    const totalBilled = done.reduce((s, j) => s + (Number(j.amountCharged) || 0), 0)
    const totalPaid = cjobs.reduce((s, j) => s + (Number(j.amountPaid) || 0), 0)
    const balance = Math.max(totalBilled - totalPaid, 0)
    const last = [...done].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
    const today = todayStr()
    const next = [...cjobs].filter((j) => j.status !== 'cancelled' && j.status !== 'done' && j.date >= today).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]
    return { count: done.length, totalBilled, totalPaid, balance, last, next }
  }

  function startEdit(c) {
    setEditingId(c.id)
    setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', zip: c.zip || '', notes: c.notes || '' })
  }
  function startNew() { setEditingId('new'); setForm(emptyForm) }
  function cancel() { setEditingId(null); setForm(emptyForm) }

  async function save(e) {
    e.preventDefault()
    const id = sanitizePhone(form.phone)
    if (!id) { setErr('El teléfono es obligatorio.'); return }
    setErr('')
    const { doc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore')
    const ref = doc(db, 'clients', id)
    const existing = await getDoc(ref)
    const data = withAudit({ name: form.name, phone: form.phone, email: form.email, zip: form.zip, notes: form.notes, updatedAt: serverTimestamp() }, auth)
    if (!existing.exists()) { data.createdAt = serverTimestamp(); data.source = 'manual'; data.vehicles = []; data.properties = [] }
    await setDoc(ref, data, { merge: true })
    cancel()
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer y no borra sus servicios ni cotizaciones registrados.')) return
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'clients', id))
  }

  async function saveList(client, key, list) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'clients', client.id), withAudit({ [key]: list }, auth))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-ink/60 text-sm">{clients.length} clientes · se agregan automáticamente al recibir una cotización.</p>
        <button onClick={startNew} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="plus" size={16} /> Nuevo cliente</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {editingId && (
        <form onSubmit={save} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid sm:grid-cols-2 gap-3">
          <Field label="Nombre"><input required className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Teléfono"><input required className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} disabled={editingId !== 'new'} /></Field>
          <Field label="Correo"><input className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Dirección / ZIP"><input className={inputCls} value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Notas"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
            <button type="button" onClick={cancel} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {!loaded && <Loading />}
      {loaded && clients.length === 0 && <EmptyState title="No hay clientes todavía." hint="Se agregan automáticamente al recibir una cotización, o puedes crear uno manualmente." ctaLabel="Nuevo cliente" onCta={startNew} />}
      <div className="grid gap-3">
        {clients.map((c) => {
          const isOpen = open === c.id
          const sum = summaryFor(c)
          return (
            <article key={c.id} className="rounded-2xl bg-white border border-ink/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-ink">{c.name || '(sin nombre)'}</h3>
                    {c.source === 'quote' && <span className="text-[10px] font-bold uppercase tracking-wide text-ink/40 bg-mist rounded-full px-2 py-0.5">Desde cotización</span>}
                  </div>
                  <p className="text-sm text-ink/70">{c.phone}{c.email && ` · ${c.email}`}{c.zip && ` · ${c.zip}`}</p>
                  {c.notes && <p className="mt-1 text-sm text-ink/60">{c.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-ink/70">{money(sum.totalBilled)} facturado</span>
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="h-9 px-3 rounded-lg border border-ink/15 text-xs font-bold hover:border-ink">{isOpen ? 'Ocultar' : 'Ver ficha'}</button>
                  <button onClick={() => startEdit(c)} aria-label="Editar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink"><Icon name="tag" size={14} /></button>
                  <button onClick={() => remove(c.id)} aria-label="Eliminar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={14} /></button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 border-t border-ink/10 pt-4 grid gap-5">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => goTo?.('quotes', { newQuoteFor: { name: c.name, phone: c.phone, email: c.email, zip: c.zip } })} className="h-9 px-3 rounded-lg border border-ink/20 text-xs font-bold hover:border-ink">+ Nueva cotización</button>
                    <button onClick={() => goTo?.('jobs', { clientId: c.id })} className="h-9 px-3 rounded-lg border border-ink/20 text-xs font-bold hover:border-ink">+ Nuevo servicio</button>
                    <button onClick={() => goTo?.('plans', { clientId: c.id })} className="h-9 px-3 rounded-lg border border-ink/20 text-xs font-bold hover:border-ink">+ Nuevo plan</button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MiniStat label="Servicios" value={sum.count} />
                    <MiniStat label="Total facturado" value={money(sum.totalBilled)} />
                    <MiniStat label="Total pagado" value={money(sum.totalPaid)} />
                    <MiniStat label="Saldo pendiente" value={money(sum.balance)} />
                    <MiniStat label="Último servicio" value={sum.last ? fmtDate(sum.last.date) : '—'} />
                    <MiniStat label="Próximo servicio" value={sum.next ? fmtDate(sum.next.date) : '—'} />
                    <MiniStat label="Plan activo" value={activePlanFor(c)?.name || '—'} />
                  </div>

                  <ListEditor title="Vehículos" items={c.vehicles || []} empty={emptyVehicle}
                    onSave={(list) => saveList(c, 'vehicles', list)}
                    renderRow={(v) => `${v.make} ${v.model} ${v.year}`.trim() || '(sin datos)'}
                    fields={[['make', 'Marca'], ['model', 'Modelo'], ['year', 'Año'], ['color', 'Color'], ['plate', 'Matrícula']]} />

                  <ListEditor title="Propiedades" items={c.properties || []} empty={emptyProperty}
                    onSave={(list) => saveList(c, 'properties', list)}
                    renderRow={(p) => p.address || '(sin dirección)'}
                    fields={[['address', 'Dirección'], ['type', 'Tipo']]} />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">Historial de servicios</p>
                    {jobsFor(c).length === 0 && <p className="text-sm text-ink/50">Sin servicios registrados.</p>}
                    <div className="grid gap-1.5">
                      {jobsFor(c).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((j) => (
                        <div key={j.id} className="flex items-center justify-between text-sm">
                          <span>{fmtDate(j.date)} · {j.service}</span>
                          <span className="font-bold">{money(j.amountCharged)} · {j.paymentStatus === 'paid' ? 'Pagado' : j.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">Cotizaciones</p>
                    {quotesFor(c).length === 0 && <p className="text-sm text-ink/50">Sin cotizaciones registradas.</p>}
                    <div className="grid gap-1.5">
                      {quotesFor(c).map((q) => (
                        <div key={q.id} className="flex items-center justify-between text-sm">
                          <span>{q.createdAt?.toDate ? fmtDate(q.createdAt.toDate().toISOString().slice(0, 10)) : '—'} · {q.service}</span>
                          <span className="text-ink/60">{q.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="text-sm font-extrabold text-ink mt-0.5">{value}</p>
    </div>
  )
}

function ListEditor({ title, items, empty, fields, renderRow, onSave }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(empty)

  function add() {
    onSave([...items, { id: uid(), ...draft }])
    setDraft(empty)
    setAdding(false)
  }
  function remove(id) {
    onSave(items.filter((i) => i.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{title}</p>
        <button onClick={() => setAdding(!adding)} className="text-xs font-bold text-ink hover:underline">{adding ? 'Cancelar' : '+ Agregar'}</button>
      </div>
      {items.length === 0 && !adding && <p className="text-sm text-ink/50">Ninguno registrado.</p>}
      <div className="grid gap-1.5 mb-2">
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between text-sm bg-mist rounded-lg px-3 py-2">
            <span>{renderRow(i)}</span>
            <button onClick={() => remove(i.id)} aria-label="Quitar" className="text-ink/40 hover:text-red-600"><Icon name="trash" size={13} /></button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="grid sm:grid-cols-3 gap-2">
          {fields.map(([key, label]) => (
            <input key={key} placeholder={label} className={inputCls} value={draft[key]} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} />
          ))}
          <button onClick={add} className="h-11 px-4 rounded-lg bg-gold text-ink font-bold text-sm">Guardar</button>
        </div>
      )}
    </div>
  )
}
