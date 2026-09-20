import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { content } from '../../content'
import Icon from '../Icon'
import { FilterBtn } from './shared'

const STATUSES = ['new', 'contacted', 'scheduled', 'done', 'lost']
const LABEL = { new: 'Nuevo', contacted: 'Contactado', scheduled: 'Agendado', done: 'Terminado', lost: 'Perdido' }
const COLOR = {
  new: 'bg-gold text-ink', contacted: 'bg-blue-100 text-blue-900', scheduled: 'bg-purple-100 text-purple-900', done: 'bg-green-100 text-green-900', lost: 'bg-ink/10 text-ink/60',
}
const serviceName = (id) => content.es.services.find((s) => s.id === id)?.title || id || '—'

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState([])
  const [filter, setFilter] = useState('all')
  const [err, setErr] = useState('')

  useEffect(() => {
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, orderBy, query }) => {
      unsub = onSnapshot(query(collection(db, 'quotes'), orderBy('createdAt', 'desc')), (snap) => {
        setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }, (e) => setErr(e.message))
    })
    return () => unsub && unsub()
  }, [])

  async function setStatus(id, status) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'quotes', id), { status })
  }

  const shown = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const counts = Object.fromEntries(STATUSES.map((s) => [s, quotes.filter((q) => q.status === s).length]))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todas ({quotes.length})</FilterBtn>
        {STATUSES.map((s) => <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} ({counts[s]})</FilterBtn>)}
      </div>
      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}
      {shown.length === 0 && <p className="text-ink/60">No hay solicitudes en esta vista.</p>}
      <div className="grid gap-4">
        {shown.map((q) => (
          <article key={q.id} className="rounded-2xl bg-white border border-ink/10 p-5 grid md:grid-cols-[1fr_auto] gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${COLOR[q.status] || COLOR.new}`}>{LABEL[q.status] || q.status}</span>
                <span className="text-xs text-ink/50">{q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString('es-CO') : '—'} · {q.lang?.toUpperCase()}</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">{q.name}</h2>
              <p className="text-ink/80"><span className="font-semibold">{serviceName(q.service)}</span>{q.vehicle && ` · ${q.vehicle}`}{q.zip && ` · ${q.zip}`}{q.email && ` · ${q.email}`}</p>
              {q.message && <p className="mt-2 text-sm text-ink/70 whitespace-pre-line">{q.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${q.phone}`} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-ink text-gold text-sm font-bold"><Icon name="phone" size={16} /> {q.phone}</a>
                <a href={`sms:${q.phone}`} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-ink/20 text-sm font-bold"><Icon name="message" size={16} /> SMS</a>
              </div>
            </div>
            <label className="text-sm font-medium grid gap-1 self-start">Estado
              <select value={q.status || 'new'} onChange={(e) => setStatus(q.id, e.target.value)} className="h-10 rounded-lg border border-ink/20 px-3 bg-white">
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </label>
          </article>
        ))}
      </div>
    </div>
  )
}
