import { useEffect, useState } from 'react'
import { auth, db } from '../../firebase'
import Icon from '../Icon'
import { Field, inputCls, StatCard, FilterBtn, Loading, EmptyState } from './shared'
import { money, fmtDate, todayStr, addMonthsStr, monthKey, monthLabel, last6Months, withAudit } from './util'

const CATEGORIES = ['Supplies', 'Fuel', 'Equipment', 'Advertising', 'Maintenance', 'Other']
const emptyForm = { description: '', amount: '', date: todayStr(), category: CATEGORIES[0] }
const RANGES = ['month', 'lastMonth', 'last3', 'year', 'custom']
const RANGE_LABEL = { month: 'Este mes', lastMonth: 'Mes anterior', last3: 'Últimos 3 meses', year: 'Este año', custom: 'Rango personalizado' }

function rangeBounds(range, custom) {
  const today = todayStr()
  if (range === 'month') return [today.slice(0, 8) + '01', today]
  if (range === 'lastMonth') { const start = addMonthsStr(today.slice(0, 8) + '01', -1); return [start, addMonthsStr(start, 1)] }
  if (range === 'last3') return [addMonthsStr(today.slice(0, 8) + '01', -2), today]
  if (range === 'year') return [today.slice(0, 4) + '-01-01', today]
  return [custom.from || '0000-01-01', custom.to || today]
}

export default function AdminFinance() {
  const [entries, setEntries] = useState([])
  const [jobs, setJobs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [range, setRange] = useState('month')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub1 = null, unsub2 = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub1 = onSnapshot(query(collection(db, 'finance'), orderBy('date', 'desc')), (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoaded(true)
      }, (e) => setErr(e.message))
      unsub2 = onSnapshot(collection(db, 'jobs'), (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
    })
    return () => { unsub1 && unsub1(); unsub2 && unsub2() }
  }, [])

  const [from, to] = rangeBounds(range, custom)
  const inRange = entries.filter((e) => e.date >= from && e.date <= to)

  const income = inRange.filter((e) => e.type === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const expenses = inRange.filter((e) => e.type === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const net = income - expenses

  const byService = {}
  jobs.filter((j) => j.status === 'done' && j.date >= from && j.date <= to).forEach((j) => {
    byService[j.service] = (byService[j.service] || 0) + (Number(j.amountCharged) || 0)
  })
  const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // Outstanding receivables — money owed for work already performed, never counted as income.
  const unpaidJobs = jobs.filter((j) => (j.status === 'done' || j.status === 'in_progress') && j.paymentStatus !== 'paid')
  const pendingTotal = unpaidJobs.reduce((s, j) => s + Math.max((Number(j.amountCharged) || 0) - (Number(j.amountPaid) || 0), 0), 0)
  const partialJobs = jobs.filter((j) => j.paymentStatus === 'partial')

  const months = last6Months()
  const incomeByMonth = months.map((mk) => entries.filter((e) => e.type === 'income' && e.date && monthKey(e.date) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0))
  const expenseByMonth = months.map((mk) => entries.filter((e) => e.type === 'expense' && e.date && monthKey(e.date) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0))
  const maxBar = Math.max(...incomeByMonth, ...expenseByMonth, 1)

  function startEdit(e) { setEditingId(e.id); setForm({ description: e.description, amount: e.amount, date: e.date, category: e.category || CATEGORIES[0] }); setOpen(true) }
  function startNew() { setEditingId('new'); setForm(emptyForm); setOpen(true) }

  async function saveExpense(e) {
    e.preventDefault()
    if (!form.description || !form.amount) { setErr('Completa descripción y monto.'); return }
    setErr('')
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    const data = withAudit({ type: 'expense', description: form.description, amount: Number(form.amount), date: form.date, category: form.category }, auth)
    if (editingId === 'new') await addDoc(collection(db, 'finance'), { ...data, createdAt: serverTimestamp() })
    else await updateDoc(doc(db, 'finance', editingId), data)
    setForm(emptyForm)
    setOpen(false)
    setEditingId(null)
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'finance', id))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {RANGES.map((r) => <FilterBtn key={r} active={range === r} onClick={() => setRange(r)}>{RANGE_LABEL[r]}</FilterBtn>)}
      </div>
      {range === 'custom' && (
        <div className="flex flex-wrap items-end gap-2 mb-6">
          <Field label="Desde"><input type="date" className={inputCls} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></Field>
          <Field label="Hasta"><input type="date" className={inputCls} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></Field>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Ingresos" value={money(income)} tone="good" />
        <StatCard label="Gastos" value={money(expenses)} tone="bad" />
        <StatCard label="Ganancia neta" value={money(net)} tone={net >= 0 ? 'good' : 'bad'} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total cobrado" value={money(income)} tone="good" />
        <StatCard label="Pendiente por cobrar" value={money(pendingTotal)} tone={pendingTotal > 0 ? 'bad' : undefined} />
        <StatCard label="Pagos parciales" value={partialJobs.length} />
      </div>

      <div className="mb-6 rounded-2xl bg-white border border-ink/10 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-3">Ingresos vs gastos — últimos 6 meses</p>
        <div className="flex items-end gap-4 h-40">
          {months.map((mk, i) => (
            <div key={mk} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-1 h-full w-full justify-center">
                <div className="w-3 rounded-t bg-green-500" style={{ height: `${Math.max((incomeByMonth[i] / maxBar) * 100, 2)}%` }} title={money(incomeByMonth[i])} />
                <div className="w-3 rounded-t bg-red-400" style={{ height: `${Math.max((expenseByMonth[i] / maxBar) * 100, 2)}%` }} title={money(expenseByMonth[i])} />
              </div>
              <span className="text-[11px] text-ink/50">{monthLabel(mk)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-ink/50"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Ingresos</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Gastos</span></div>
      </div>

      {topServices.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white border border-ink/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-3">Servicios más rentables (periodo)</p>
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
        <p className="text-ink/60 text-sm">Los ingresos se generan automáticamente al marcar un servicio como pagado (total o parcial) en Servicios.</p>
        <button onClick={startNew} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold shrink-0"><Icon name="plus" size={16} /> Nuevo gasto</button>
      </div>

      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}

      {open && (
        <form onSubmit={saveExpense} className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 grid sm:grid-cols-4 gap-3">
          <Field label="Descripción"><input required className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Categoría">
            <select className={inputCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Monto (USD)"><input required type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></Field>
          <Field label="Fecha"><input required type="date" className={inputCls} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <div className="sm:col-span-4 flex gap-2">
            <button className="h-11 px-5 rounded-lg bg-gold text-ink font-bold">Guardar gasto</button>
            <button type="button" onClick={() => { setOpen(false); setEditingId(null) }} className="h-11 px-5 rounded-lg border border-ink/20 font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {!loaded && <Loading />}
      {loaded && inRange.length === 0 && <EmptyState title="No hay movimientos en este periodo." hint="Ajusta el rango de fechas o registra un nuevo gasto." />}
      <div className="grid gap-2">
        {inRange.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl bg-white border border-ink/10 p-3.5">
            <div>
              <p className="font-semibold text-ink">{e.description}{e.category && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-ink/40 bg-mist rounded-full px-2 py-0.5">{e.category}</span>}</p>
              <p className="text-xs text-ink/50">{fmtDate(e.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-bold ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>{e.type === 'income' ? '+' : '-'}{money(e.amount)}</span>
              {e.type === 'expense' && <button onClick={() => startEdit(e)} aria-label="Editar" className="grid place-items-center w-8 h-8 rounded-full hover:bg-mist"><Icon name="tag" size={13} /></button>}
              <button onClick={() => remove(e.id)} aria-label="Eliminar" className="grid place-items-center w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-600"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
