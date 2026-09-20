import { useEffect, useRef, useState } from 'react'
import { db } from '../../firebase'
import Icon from '../Icon'

function norm(s) { return (s || '').toString().toLowerCase() }

export default function AdminSearch({ goTo }) {
  const [clients, setClients] = useState([])
  const [quotes, setQuotes] = useState([])
  const [jobs, setJobs] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    let u1 = null, u2 = null, u3 = null
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
      u1 = onSnapshot(collection(db, 'clients'), (s) => setClients(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      u2 = onSnapshot(collection(db, 'quotes'), (s) => setQuotes(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      u3 = onSnapshot(collection(db, 'jobs'), (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    })
    return () => { u1 && u1(); u2 && u2(); u3 && u3() }
  }, [])

  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const term = norm(q)
  const matchClients = term ? clients.filter((c) => [c.name, c.phone, c.email, c.zip].some((f) => norm(f).includes(term))).slice(0, 5) : []
  const matchQuotes = term ? quotes.filter((c) => [c.name, c.phone, c.email, c.zip, c.service].some((f) => norm(f).includes(term))).slice(0, 5) : []
  const matchJobs = term ? jobs.filter((j) => [j.clientName, j.service, j.address].some((f) => norm(f).includes(term))).slice(0, 5) : []
  const hasResults = matchClients.length + matchQuotes.length + matchJobs.length > 0

  function pick(tab, payload) {
    goTo(tab, payload)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 focus-within:bg-white/20 w-36 sm:w-44">
        <Icon name="globe" size={14} className="text-white/50 shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar…"
          className="bg-transparent text-white placeholder:text-white/40 text-sm w-full focus:outline-none"
        />
      </div>
      {open && term && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white text-ink shadow-xl border border-ink/10 z-50">
          {!hasResults && <p className="p-4 text-sm text-ink/50">Sin resultados.</p>}
          {matchClients.length > 0 && (
            <Group title="Clientes">
              {matchClients.map((c) => (
                <Row key={c.id} title={c.name || c.phone} sub={c.phone} onClick={() => pick('clients', { clientId: c.id })} />
              ))}
            </Group>
          )}
          {matchQuotes.length > 0 && (
            <Group title="Cotizaciones">
              {matchQuotes.map((c) => (
                <Row key={c.id} title={c.name} sub={c.service || c.phone} onClick={() => pick('quotes', { quoteId: c.id })} />
              ))}
            </Group>
          )}
          {matchJobs.length > 0 && (
            <Group title="Servicios">
              {matchJobs.map((j) => (
                <Row key={j.id} title={j.clientName} sub={j.service} onClick={() => pick('jobs', { id: j.id })} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ title, children }) {
  return (
    <div className="border-b border-ink/5 last:border-0">
      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">{title}</p>
      {children}
    </div>
  )
}

function Row({ title, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-2 hover:bg-mist text-sm">
      <span className="font-semibold text-ink">{title || '—'}</span>
      {sub && <span className="text-ink/50"> · {sub}</span>}
    </button>
  )
}
