import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { Field, inputCls, FilterBtn } from './shared'
import { money, fmtDate } from './util'

const SERVICE_TITLES = content.es.services.map((s) => s.title)
const STATUSES = ['scheduled', 'done', 'cancelled']
const LABEL = { scheduled: 'Agendado', done: 'Terminado', cancelled: 'Cancelado' }
const COLOR = { scheduled: 'bg-purple-100 text-purple-900', done: 'bg-green-100 text-green-900', cancelled: 'bg-ink/10 text-ink/60' }

const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = { clientId: '', service: SERVICE_TITLES[0] || '', date: today(), amountCharged: '', status: 'done', notes: '' }

export default function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [clients, setClients] = useState([])
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub1 = null, unsub2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub1 = onSnapshot(query(collection(db, 'jobs'), orderBy('date', 'desc')), (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => setErr(e.message))
      unsub2 = onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { unsub1 && unsub1(); unsub2 && unsub2() }
  }, [])

  async function syncFinance(job) {
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore')
    const ref = doc(db, 'finance', `job_${job.id}`)
    if (job.status === 'done' && Number(job.amountCharged) > 0) {
      await setDoc(ref, {
        type: 'income',
        amount: Number(job.amountCharged),
        description: `${job.service} — ${job.clientName}`,
        jobId: job.id,
        date: job.date,
      })
    } else {
      await deleteDoc(ref).catch(() => {})
    }
  }

  function startNew() { setEditingId('new'); setForm(emptyForm) }
  function startEdit(j) {
    setEditingId(j.id)
    setForm({ clientId: j.clientId, service: j.service, date: j.date, amountCharged: j.amountCharged ?? '', status: j.status, notes: j.notes || '' })
  }
  function cancel() { setEditingId(null); setForm(emptyForm) }

  async function save(e) {
    e.preventDefault()
    const client = clients.find((c) => c.id === form.clientId)
    if (!client) { setErr('Selecciona un cliente.'); return }
    setErr('')
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    const data = {
      clientId: form.clientId, clientName: client.name || client.phone,
      service: form.service, date: form.date, amountCharged: form.amountCharged ? Number(form.amountCharged) : 0,
      status: form.status, notes: form.notes,
    }
    let id = editingId
    if (editingId === 'new') {
      const ref = await addDoc(collection(db, 'jobs'), { ...data, createdAt: serverTimestamp() })
      id = ref.id
    } else {
      await updateDoc(doc(db, 'jobs', editingId), data)
    }
    await syncFinance({ ...data, id })
    cancel()
  }

  async function remove(job) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'jobs', job.id))
    await deleteDoc(doc(db, 'finance', `job_${job.id}`)).catch(() => {})
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
            <select required className={inputCls} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
              <option value="">Seleccione un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name || c.phone} · {c.phone}</option>)}
            </select>
          </Field>
          <Field label="Servicio">
            <select className={inputCls} value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}>
              {SERVICE_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Fecha"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Cobrado (USD)"><input type="number" min="0" step="0.01" className={inputCls} value={form.amountCharged} onChange={(e) => setForm((f) => ({ ...f, amountCharged: e.target.value }))} /></Field>
          <Field label="Estado">
            <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notas"><textarea rows="2" className={`${inputCls} w-full h-auto py-2`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar</button>
            <button type="button" onClick={cancel} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {shown.length === 0 && <p className="text-ink/60">No hay servicios en esta vista.</p>}
      <div className="grid gap-3">
        {shown.map((j) => (
          <article key={j.id} className="rounded-xl bg-white border border-ink/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${COLOR[j.status] || COLOR.scheduled}`}>{LABEL[j.status] || j.status}</span>
                <span className="text-xs text-ink/50">{fmtDate(j.date)}</span>
              </div>
              <p className="mt-1 font-bold text-ink">{j.service}</p>
              <p className="text-sm text-ink/70">{j.clientName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-ink">{money(j.amountCharged)}</span>
              <button onClick={() => startEdit(j)} aria-label="Editar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink"><Icon name="tag" size={14} /></button>
              <button onClick={() => remove(j)} aria-label="Eliminar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
