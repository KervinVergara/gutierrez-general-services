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
  // isAdmin: undefined = aún no lo sabemos, true/false = confirmado desde el
  // custom claim del token. Nunca se asume admin solo por haber sesión.
  const [isAdmin, setIsAdmin] = useState(undefined)
  const [tab, setTab] = useState('dashboard')
  const [nav, setNav] = useState(null)
  const [adminLang, setAdminLang] = useState(() => localStorage.getItem('adminLang') || 'es')
  const [err, setErr] = useState('')

  function toggleAdminLang() {
    const next = adminLang === 'es' ? 'en' : 'es'
    setAdminLang(next)
    localStorage.setItem('adminLang', next)
  }

  function goToTab(tabId, payload) { setNav(payload || null); setTab(tabId) }
  function clearNav() { setNav(null) }

  // Reads the admin custom claim from the current (or freshly refreshed) ID
  // token. Being signed in is NOT enough — firestore.rules already enforces
  // this claim server-side, but the UI needs to know it too so it doesn't
  // render the panel shell (and fire off a dozen onSnapshot listeners that
  // would just fail with permission-denied) for a non-admin account.
  async function refreshAdminClaim(u, forceRefresh) {
    if (!u) { setIsAdmin(false); return }
    try {
      const result = await u.getIdTokenResult(forceRefresh)
      setIsAdmin(result.claims?.admin === true)
    } catch {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    if (!isConfigured) { setUser(null); setIsAdmin(false); return }
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        refreshAdminClaim(u, false)
      })
    })
  }, [])

  // Custom claims don't auto-refresh on the client — if the admin claim gets
  // revoked while this tab is open, the cached token can stay valid for up
  // to ~1h. Forcing a refresh whenever the tab regains focus catches that
  // sooner without polling constantly in the background.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        refreshAdminClaim(auth.currentUser, true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Every quote that comes in from the public site automatically feeds the client database.
  useEffect(() => {
    if (!user || !isAdmin) return
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
  }, [user, isAdmin])

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
  if (user === undefined || (user && isAdmin === undefined)) return <Shell><p className="text-center text-ink/60">Cargando…</p></Shell>

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

  if (!isAdmin) {
    return (
      <Shell right={<button onClick={logout} className="text-sm font-semibold hover:text-gold whitespace-nowrap">Salir</button>}>
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 grid gap-3 text-center shadow-sm border border-ink/10">
          <h1 className="text-xl font-extrabold">Sin permisos</h1>
          <p className="text-sm text-ink/60">Tu cuenta ({user.email}) no tiene permisos de administrador para este panel.</p>
        </div>
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
