import { useEffect, useState } from 'react'
import { auth, db, isConfigured } from '../firebase'
import Icon from './Icon'
import { TabBtn } from './admin/shared'
import { sanitizePhone } from './admin/util'
import AdminSearch from './admin/AdminSearch'
import AdminDashboard from './admin/AdminDashboard'
import AdminQuotes from './admin/AdminQuotes'
import AdminClients from './admin/AdminClients'
import AdminJobs from './admin/AdminJobs'
import AdminPlans from './admin/AdminPlans'
import AdminFinance from './admin/AdminFinance'
import AdminRequests from './admin/AdminRequests'
import AdminDocs from './admin/AdminDocs'

const TABS = [
  { id: 'dashboard', label: 'Inicio', Component: AdminDashboard },
  { id: 'quotes', label: 'Cotizaciones', Component: AdminQuotes },
  { id: 'clients', label: 'Clientes', Component: AdminClients },
  { id: 'jobs', label: 'Servicios', Component: AdminJobs },
  { id: 'plans', label: 'Planes', Component: AdminPlans },
  { id: 'finance', label: 'Finanzas', Component: AdminFinance },
  { id: 'requests', label: 'Cambios web', Component: AdminRequests },
  { id: 'docs', label: 'Documentos', Component: AdminDocs },
]

export default function Admin() {
  const [user, setUser] = useState(undefined)
  const [tab, setTab] = useState('dashboard')
  const [nav, setNav] = useState(null)
  const [adminLang, setAdminLang] = useState(() => localStorage.getItem('adminLang') || 'es')
  const [err, setErr] = useState('')

  // Preference is saved for when the full admin translation ships — every screen is
  // still Spanish-only today, so switching this never mixes languages on one screen.
  function toggleAdminLang() {
    const next = adminLang === 'es' ? 'en' : 'es'
    setAdminLang(next)
    localStorage.setItem('adminLang', next)
  }

  // Generic cross-tab jump: goToTab('jobs', { id }) opens that job; goToTab('clients', { clientId })
  // opens that client's ficha; etc. Each tab component reads only the fields it understands.
  function goToTab(tabId, payload) { setNav(payload || null); setTab(tabId) }
  function clearNav() { setNav(null) }

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
          if (!existing.exists()) { data.createdAt = serverTimestamp(); data.source = 'quote'; data.vehicles = []; data.properties = [] }
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
    <Shell right={
      <div className="flex items-center gap-3">
        <AdminSearch goTo={goToTab} />
        <button onClick={toggleAdminLang} title="Selector de idioma (próximamente disponible para todo el panel)" className="text-sm font-semibold hover:text-gold whitespace-nowrap">{adminLang.toUpperCase()} / {adminLang === 'es' ? 'EN' : 'ES'}</button>
        <button onClick={logout} className="text-sm font-semibold hover:text-gold whitespace-nowrap">Salir</button>
      </div>
    }>
      <div className="flex items-center gap-1 mb-8 border-b border-ink/10 overflow-x-auto overflow-y-hidden flex-nowrap">
        {TABS.map((t) => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</TabBtn>)}
      </div>
      <Active goTo={goToTab} focus={nav} onFocusHandled={clearNav} />
    </Shell>
  )
}

function Shell({ children, right }) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-ink text-white h-16 flex items-center">
        <div className="mx-auto max-w-5xl w-full px-4 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 shrink-0"><span className="grid place-items-center w-9 h-9 rounded-lg bg-gold text-ink"><Icon name="car" size={22} /></span><span className="display font-bold text-lg tracking-wide hidden sm:inline">GUTIERREZ<span className="text-gold"> GS</span> · Admin</span></a>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
