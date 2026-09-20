import { useEffect, useState } from 'react'
import { auth, db, isConfigured } from '../firebase'
import Icon from './Icon'
import { TabBtn } from './admin/shared'
import { sanitizePhone } from './admin/util'
import AdminQuotes from './admin/AdminQuotes'
import AdminClients from './admin/AdminClients'
import AdminJobs from './admin/AdminJobs'
import AdminFinance from './admin/AdminFinance'
import AdminRequests from './admin/AdminRequests'

const TABS = [
  { id: 'quotes', label: 'Cotizaciones', Component: AdminQuotes },
  { id: 'clients', label: 'Clientes', Component: AdminClients },
  { id: 'jobs', label: 'Servicios', Component: AdminJobs },
  { id: 'finance', label: 'Finanzas', Component: AdminFinance },
  { id: 'requests', label: 'Solicitudes', Component: AdminRequests },
]

export default function Admin() {
  const [user, setUser] = useState(undefined)
  const [tab, setTab] = useState('quotes')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!isConfigured) { setUser(null); return }
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, (u) => setUser(u))
    })
  }, [])

  // Every quote that comes in from the public site automatically feeds the client database.
  useEffect(() => {
    if (!user) return
    let unsub = null
    import('firebase/firestore').then(({ collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp }) => {
      unsub = onSnapshot(collection(db, 'quotes'), (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === 'removed') return
          const q = change.doc.data()
          const id = sanitizePhone(q.phone)
          if (!id) return
          const ref = doc(db, 'clients', id)
          const existing = await getDoc(ref)
          const data = {
            name: q.name || existing.data()?.name || '',
            phone: q.phone,
            email: q.email || existing.data()?.email || '',
            zip: q.zip || existing.data()?.zip || '',
            updatedAt: serverTimestamp(),
          }
          if (!existing.exists()) { data.createdAt = serverTimestamp(); data.source = 'quote' }
          await setDoc(ref, data, { merge: true })
        })
      })
    })
    return () => unsub && unsub()
  }, [user])

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

  const Active = TABS.find((t) => t.id === tab).Component

  return (
    <Shell right={<button onClick={logout} className="text-sm font-semibold hover:text-gold">Salir</button>}>
      <div className="flex items-center gap-1 mb-8 border-b border-ink/10 overflow-x-auto">
        {TABS.map((t) => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</TabBtn>)}
      </div>
      <Active />
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
