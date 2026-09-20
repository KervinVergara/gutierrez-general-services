import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'
import { FilterBtn } from './shared'
import { todayStr } from './util'

const CATEGORY_DOT = { auto: 'bg-blue-500', property: 'bg-green-500', seasonal: 'bg-amber-500' }
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toDateStr(d) { return d.toISOString().slice(0, 10) }
function startOfWeek(d) { const c = new Date(d); const day = (c.getDay() + 6) % 7; c.setDate(c.getDate() - day); return c }

export default function AdminAgenda({ openJob, createJobAt }) {
  const [jobs, setJobs] = useState([])
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(new Date())

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
      unsub = onSnapshot(collection(db, 'jobs'), (snap) => setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    })
    return () => unsub && unsub()
  }, [])

  function jobsOn(dateStr) { return jobs.filter((j) => j.date === dateStr && j.status !== 'cancelled').sort((a, b) => (a.time || '').localeCompare(b.time || '')) }

  function shift(delta) {
    const c = new Date(cursor)
    if (view === 'month') c.setMonth(c.getMonth() + delta)
    else c.setDate(c.getDate() + delta * 7)
    setCursor(c)
  }

  const monthLabel = cursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FilterBtn active={view === 'month'} onClick={() => setView('month')}>Mensual</FilterBtn>
          <FilterBtn active={view === 'week'} onClick={() => setView('week')}>Semanal</FilterBtn>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Anterior" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink">‹</button>
          <p className="font-bold text-ink capitalize w-40 text-center">{view === 'month' ? monthLabel : `Semana del ${toDateStr(startOfWeek(cursor)).slice(5)}`}</p>
          <button onClick={() => shift(1)} aria-label="Siguiente" className="grid place-items-center w-9 h-9 rounded-full border border-ink/15 hover:border-ink">›</button>
          <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-lg border border-ink/15 text-xs font-bold hover:border-ink">Hoy</button>
        </div>
      </div>

      {view === 'month' ? <MonthGrid cursor={cursor} jobsOn={jobsOn} openJob={openJob} createJobAt={createJobAt} /> : <WeekList cursor={cursor} jobsOn={jobsOn} openJob={openJob} createJobAt={createJobAt} />}
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
