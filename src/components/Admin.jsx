import { useEffect, useState } from 'react'
import { auth, db, isConfigured } from '../firebase'
import { content } from '../content'
import Icon from './Icon'

const STATUSES = ['new', 'contacted', 'scheduled', 'done', 'lost']
const LABEL = {
  new: 'Nuevo', contacted: 'Contactado', scheduled: 'Agendado', done: 'Terminado', lost: 'Perdido',
}
const COLOR = {
  new: 'bg-gold text-ink', contacted: 'bg-blue-100 text-blue-900', scheduled: 'bg-purple-100 text-purple-900', done: 'bg-green-100 text-green-900', lost: 'bg-ink/10 text-ink/60',
}
const serviceName = (id) => content.es.services.find((s) => s.id === id)?.title || id || '—'

export default function Admin() {
  const [user, setUser] = useState(undefined)
  const [quotes, setQuotes] = useState([])
  const [filter, setFilter] = useState('all')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!isConfigured) { setUser(null); return }
    let unsubQuotes = null
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, async (u) => {
        setUser(u)
        if (unsubQuotes) { unsubQuotes(); unsubQuotes = null }
        if (u) {
          const { collection, onSnapshot, orderBy, query } = await import('firebase/firestore')
          unsubQuotes = onSnapshot(query(collection(db, 'quotes'), orderBy('createdAt', 'desc')), (snap) => {
            setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
          }, (e) => setErr(e.message))
        }
      })
    })
    return () => unsubQuotes && unsubQuotes()
  }, [])

  async function login(e) {
    e.preventDefault()
    setErr('')
    const f = new FormData(e.target)
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'))
    } catch (e) { setErr('Correo o contraseña incorrectos.') }
  }

  async function logout() {
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  }

  async function setStatus(id, status) {
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'quotes', id), { status })
  }

  if (!isConfigured) return <Shell><p className="text-center">Firebase no está configurado. Copia <code>.env.example</code> a <code>.env</code> con las credenciales del proyecto.</p></Shell>
  if (user === undefined) return <Shell><p className="text-center text-ink/60">Cargando…</p></Shell>

  if (!user) {
    return (
      <Shell>
        <form onSubmit={login} className="mx-auto max-w-sm rounded-2xl bg-white p-8 grid gap-4 shadow-sm border border-ink/10">
          <h1 className="text-3xl font-extrabold uppercase">Panel interno</h1>
          <label className="grid gap-1 text-sm font-medium">Correo<input name="email" type="email" required className="h-12 rounded-lg border border-ink/20 px-4" /></label>
          <label className="grid gap-1 text-sm font-medium">Contraseña<input name="password" type="password" required className="h-12 rounded-lg border border-ink/20 px-4" /></label>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <button className="h-12 rounded-lg bg-ink text-gold font-bold">Entrar</button>
        </form>
      </Shell>
    )
  }

  const shown = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const counts = Object.fromEntries(STATUSES.map((s) => [s, quotes.filter((q) => q.status === s).length]))

  return (
    <Shell right={<button onClick={logout} className="text-sm font-semibold hover:text-gold">Salir</button>}>
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
    </Shell>
  )
}

function Shell({ children, right }) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-ink text-white h-16 flex items-center">
        <div className="mx-auto max-w-5xl w-full px-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5"><span className="grid place-items-center w-9 h-9 rounded-lg bg-gold text-ink"><Icon name="car" size={22} /></span><span className="display font-bold text-lg tracking-wide">GUTIERREZ<span className="text-gold"> GS</span> · Admin</span></a>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

function FilterBtn({ active, children, ...p }) {
  return <button {...p} className={`h-10 px-4 rounded-full text-sm font-semibold border ${active ? 'bg-ink text-gold border-ink' : 'bg-white border-ink/15 hover:border-ink'}`}>{children}</button>
}
