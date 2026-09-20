import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'
import { Field, inputCls } from './shared'
import { sanitizePhone, money, fmtDate } from './util'

const emptyForm = { name: '', phone: '', email: '', zip: '', notes: '' }

export default function AdminClients() {
  const [clients, setClients] = useState([])
  const [jobs, setJobs] = useState([])
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub1 = null, unsub2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub1 = onSnapshot(query(collection(db, 'clients'), orderBy('updatedAt', 'desc')), (snap) => {
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => setErr(e.message))
      unsub2 = onSnapshot(collection(db, 'jobs'), (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { unsub1 && unsub1(); unsub2 && unsub2() }
  }, [])

  function jobsFor(clientId) {
    return jobs.filter((j) => j.clientId === clientId)
  }
  function totalFor(clientId) {
    return jobsFor(clientId).filter((j) => j.status === 'done').reduce((s, j) => s + (Number(j.amountCharged) || 0), 0)
  }

  function startEdit(c) {
    setEditingId(c.id)
    setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', zip: c.zip || '', notes: c.notes || '' })
  }
  function startNew() {
    setEditingId('new')
    setForm(emptyForm)
  }
  function cancel() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function save(e) {
    e.preventDefault()
    const id = sanitizePhone(form.phone)
    if (!id) { setErr('El teléfono es obligatorio.'); return }
    setErr('')
    const { doc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore')
    const ref = doc(db, 'clients', id)
    const existing = await getDoc(ref)
    const data = { name: form.name, phone: form.phone, email: form.email, zip: form.zip, notes: form.notes, updatedAt: serverTimestamp() }
    if (!existing.exists()) { data.createdAt = serverTimestamp(); data.source = 'manual' }
    await setDoc(ref, data, { merge: true })
    cancel()
  }

  async function remove(id) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'clients', id))
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

      {clients.length === 0 && <p className="text-ink/60">No hay clientes todavía.</p>}
      <div className="grid gap-3">
        {clients.map((c) => {
          const cjobs = jobsFor(c.id)
          const isOpen = open === c.id
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
                  <span className="text-sm font-bold text-ink/70">{money(totalFor(c.id))} facturado</span>
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="h-9 px-3 rounded-lg border border-ink/15 text-xs font-bold hover:border-ink">{isOpen ? 'Ocultar' : 'Ver historial'}</button>
                  <button onClick={() => startEdit(c)} aria-label="Editar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink"><Icon name="tag" size={14} /></button>
                  <button onClick={() => remove(c.id)} aria-label="Eliminar" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-red-600 hover:text-red-600"><Icon name="trash" size={14} /></button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-4 border-t border-ink/10 pt-4">
                  {cjobs.length === 0 && <p className="text-sm text-ink/50">Sin servicios registrados.</p>}
                  <div className="grid gap-2">
                    {cjobs.map((j) => (
                      <div key={j.id} className="flex items-center justify-between text-sm">
                        <span>{fmtDate(j.date)} · {j.service}</span>
                        <span className="font-bold">{money(j.amountCharged)}</span>
                      </div>
                    ))}
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
