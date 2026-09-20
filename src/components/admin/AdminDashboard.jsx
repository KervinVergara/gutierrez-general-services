import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'
import { StatCard } from './shared'
import { money, fmtDate, todayStr, daysUntil, monthKey, monthLabel, last6Months } from './util'

const JOB_STATUS_LABEL = { scheduled: 'Agendado', in_progress: 'En progreso', done: 'Terminado', cancelled: 'Cancelado' }

export default function AdminDashboard({ goTo }) {
  const [quotes, setQuotes] = useState([])
  const [jobs, setJobs] = useState([])
  const [finance, setFinance] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let u1 = null, u2 = null, u3 = null
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
      u1 = onSnapshot(collection(db, 'quotes'), (s) => setQuotes(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      u2 = onSnapshot(collection(db, 'jobs'), (s) => { setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoaded(true) })
      u3 = onSnapshot(collection(db, 'finance'), (s) => setFinance(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    })
    return () => { u1 && u1(); u2 && u2(); u3 && u3() }
  }, [])

  const today = todayStr()
  const thisMonthKey = monthKey(today)

  const monthIncome = finance.filter((f) => f.type === 'income' && f.date && monthKey(f.date) === thisMonthKey).reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const monthExpense = finance.filter((f) => f.type === 'expense' && f.date && monthKey(f.date) === thisMonthKey).reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const newQuotes = quotes.filter((q) => q.status === 'new').length
  const pendingJobs = jobs.filter((j) => j.status === 'scheduled' || j.status === 'in_progress').length

  const todaysJobs = jobs.filter((j) => j.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  // Needs attention — only real, data-driven alerts.
  const alerts = []
  quotes.filter((q) => q.status === 'new').forEach((q) => alerts.push({ id: `q-${q.id}`, text: `Cotización nueva sin atender — ${q.name}`, tone: 'new', onClick: () => goTo?.('quotes') }))
  quotes.filter((q) => q.status === 'contacted').forEach((q) => alerts.push({ id: `qf-${q.id}`, text: `Cotización sin seguimiento — ${q.name}`, tone: 'warn', onClick: () => goTo?.('quotes') }))
  jobs.filter((j) => j.status !== 'cancelled' && j.status !== 'done').forEach((j) => {
    const d = daysUntil(j.date)
    if (d !== null && d >= 0 && d <= 2) alerts.push({ id: `js-${j.id}`, text: `Servicio próximo — ${j.clientName} · ${fmtDate(j.date)}`, tone: 'info', onClick: () => goTo?.('jobs') })
  })
  jobs.filter((j) => j.status === 'done' && j.paymentStatus !== 'paid').forEach((j) => alerts.push({ id: `jp-${j.id}`, text: `Terminado pendiente de pago — ${j.clientName} · ${money(j.amountCharged)}`, tone: 'warn', onClick: () => goTo?.('jobs') }))
  jobs.filter((j) => j.nextService?.dueDate).forEach((j) => {
    const d = daysUntil(j.nextService.dueDate)
    if (d !== null && d >= 0 && d <= 7) alerts.push({ id: `nm-${j.id}`, text: `${j.clientName} — próximo mantenimiento en ${d === 0 ? 'hoy' : `${d} día${d === 1 ? '' : 's'}`}`, tone: 'info', onClick: () => goTo?.('clients') })
  })

  const months = last6Months()
  const revByMonth = months.map((mk) => finance.filter((f) => f.type === 'income' && f.date && monthKey(f.date) === mk).reduce((s, f) => s + (Number(f.amount) || 0), 0))
  const maxRev = Math.max(...revByMonth, 1)

  return (
    <div>
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ingresos del mes" value={money(monthIncome)} tone="good" />
        <StatCard label="Ganancia neta del mes" value={money(monthIncome - monthExpense)} tone={monthIncome - monthExpense >= 0 ? 'good' : 'bad'} />
        <StatCard label="Cotizaciones nuevas" value={newQuotes} />
        <StatCard label="Servicios pendientes" value={pendingJobs} />
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-ink mb-3">Servicios de hoy</h2>
        {loaded && todaysJobs.length === 0 && (
          <div className="rounded-2xl bg-white border border-ink/10 p-6 text-center">
            <p className="text-ink/60">No hay servicios agendados para hoy.</p>
            <button onClick={() => goTo?.('jobs')} className="mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="plus" size={16} /> Nuevo servicio</button>
          </div>
        )}
        <div className="grid gap-2">
          {todaysJobs.map((j) => (
            <button key={j.id} onClick={() => goTo?.('jobs')} className="w-full text-left rounded-xl bg-white border border-ink/10 p-4 flex flex-wrap items-center justify-between gap-3 hover:border-ink/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-ink/50 w-14 shrink-0">{j.time || '—'}</span>
                <div>
                  <p className="font-bold text-ink">{j.clientName}</p>
                  <p className="text-sm text-ink/60">{j.service}{j.address && ` · ${j.address}`}</p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-ink/50">{JOB_STATUS_LABEL[j.status] || j.status}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-ink mb-3">Necesita atención</h2>
        {alerts.length === 0 && <p className="text-ink/60">Todo al día — no hay alertas pendientes.</p>}
        <div className="grid gap-2">
          {alerts.map((a) => (
            <button key={a.id} onClick={a.onClick} className="w-full text-left rounded-xl bg-white border border-ink/10 p-3.5 flex items-center gap-3 hover:border-ink/30">
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.tone === 'warn' ? 'bg-red-500' : a.tone === 'new' ? 'bg-gold' : 'bg-ink/40'}`} />
              <span className="text-sm text-ink">{a.text}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink mb-3">Ingresos — últimos 6 meses</h2>
        <div className="rounded-2xl bg-white border border-ink/10 p-5 flex items-end gap-3 h-44">
          {months.map((mk, i) => (
            <div key={mk} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-xs font-bold text-ink/60">{revByMonth[i] > 0 ? money(revByMonth[i]) : ''}</span>
              <div className="w-full rounded-t-md bg-gold" style={{ height: `${Math.max((revByMonth[i] / maxRev) * 100, 2)}%` }} />
              <span className="text-xs text-ink/50">{monthLabel(mk)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
