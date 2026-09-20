import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'
import { Field, inputCls, StatCard } from './shared'
import { money, fmtDate } from './util'

const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = { description: '', amount: '', date: today() }

export default function AdminFinance() {
  const [entries, setEntries] = useState([])
  const [jobs, setJobs] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub1 = null, unsub2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub1 = onSnapshot(query(collection(db, 'finance'), orderBy('date', 'desc')), (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => setErr(e.message))
      unsub2 = onSnapshot(collection(db, 'jobs'), (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { unsub1 && unsub1(); unsub2 && unsub2() }
  }, [])

  const income = entries.filter((e) => e.type === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const expenses = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const net = income - expenses

  const byService = {}
  jobs.filter((j) => j.status === 'done').forEach((j) => {
    byService[j.service] = (byService[j.service] || 0) + (Number(j.amountCharged) || 0)
  })
  const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 3)

  async function addExpense(e) {
    e.preventDefault()
    if (!form.description || !form.amount) { setErr('Completa descripción y monto.'); return }
    setErr('')
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    await addDoc(collection(db, 'finance'), {
      type: 'expense', description: form.description, amount: Number(form.amount), date: form.date, createdAt: serverTimestamp(),
    })
    setForm(emptyForm)
    setOpen(false)
  }

  async function remove(id) {
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'finance', id))
  }

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Ingresos" value={money(income)} tone="good" />
        <StatCard label="Gastos" value={money(expenses)} tone="bad" />
        <StatCard label="Ganancia neta" value={money(net)} tone={net >= 0 ? 'good' : 'bad'} />
      </div>

      {topServices.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white border border-ink/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-3">Servicios más rentables</p>
          <div className="grid gap-2">
            {topServices.map(([service, total]) => (
              <div key={service} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{service}</span>
                <span className="font-bold text-ink/70">{money(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-ink/60 text-sm">Los ingresos se generan automáticamente al marcar un servicio como "Terminado" en la pestaña Servicios.</p>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold shrink-0"><Icon name="plus" size={16} /> Nuevo gasto</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {open && (
        <form onSubmit={addExpense} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid sm:grid-cols-3 gap-3">
          <Field label="Descripción"><input required className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Monto (USD)"><input required type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Fecha"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <div className="sm:col-span-3 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar gasto</button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {entries.length === 0 && <p className="text-ink/60">No hay movimientos todavía.</p>}
      <div className="grid gap-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl bg-white border border-ink/10 p-3.5">
            <div>
              <p className="font-semibold text-ink">{e.description}</p>
              <p className="text-xs text-ink/50">{fmtDate(e.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-bold ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>{e.type === 'income' ? '+' : '-'}{money(e.amount)}</span>
              <button onClick={() => remove(e.id)} aria-label="Eliminar" className="grid place-items-center w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
