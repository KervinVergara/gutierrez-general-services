import { useEffect, useState } from 'react'
import { auth, db, isConfigured } from '../firebase'
import Icon from './Icon'
import { TabBtn } from './admin/shared'
import { sanitizePhone, withAudit } from './admin/util'
import AdminSearch from './admin/AdminSearch'
import AdminDashboard from './admin/AdminDashboard'
import AdminQuotes from './admin/AdminQuotes'
import AdminClients from './admin/AdminClients'
import AdminJobs from './admin/AdminJobs'
import AdminPlans from './admin/AdminPlans'
import AdminFinance from './admin/AdminFinance'
import AdminRequests from './admin/AdminRequests'
import AdminDocs from './admin/AdminDocs'
import AdminAudit from './admin/AdminAudit'

const TABS = [
  { id: 'dashboard', label: 'Inicio', Component: AdminDashboard },
  { id: 'quotes', label: 'Cotizaciones', Component: AdminQuotes },
  { id: 'clients', label: 'Clientes', Component: AdminClients },
  { id: 'jobs', label: 'Servicios', Component: AdminJobs },
  { id: 'plans', label: 'Planes', Component: AdminPlans },
  { id: 'finance', label: 'Finanzas', Component: AdminFinance },
  { id: 'requests', label: 'Cambios web', Component: AdminRequests },
  { id: 'docs', label: 'Documentos', Component: AdminDocs },
  { id: 'audit', label: 'Auditoría', Component: AdminAudit },
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
          const data = withAudit({
            name: q.name || existing.data()?.name || '',
            phone: q.phone,
            email: q.email || existing.data()?.email || '',
            zip: q.zip || existing.data()?.zip || '',
            updatedAt: serverTimestamp(),
          }, auth)
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

  // Google Sign-In: same account (by uid) can end up signed in either way
  // once linked below — the admin custom claim (and firestore.rules) don't
  // care which method was used, only which uid it is.
  async function loginWithGoogle() {
    setErr('')
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      if (e?.code === 'auth/account-exists-with-different-credential') {
        setErr('Ya existe una cuenta con ese correo usando contraseña. Inicia sesión con la contraseña y usa "Vincular cuenta de Google" abajo.')
      } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setErr('No se pudo iniciar sesión con Google.')
      }
    }
  }

  // Lets an already-logged-in admin (via password) attach Google Sign-In to
  // the SAME account, as a step toward dropping the password entirely (see
  // unlinkPassword below). Must be signed in first — Firebase links to
  // auth.currentUser, it doesn't create a second account.
  async function linkGoogle() {
    setErr('')
    try {
      const { GoogleAuthProvider, linkWithPopup } = await import('firebase/auth')
      await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
      setUser({ ...auth.currentUser })
    } catch (e) {
      if (e?.code === 'auth/credential-already-in-use') {
        setErr('Esa cuenta de Google ya está vinculada a otra cuenta.')
      } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setErr('No se pudo vincular la cuenta de Google.')
      }
    }
  }

  // Once Google is linked, this removes the password as a way in — from
  // then on the only way to reach this account is Google Sign-In, which
  // carries whatever 2FA is already active on that Google account.
  async function unlinkPassword() {
    if (!confirm('Esto quita la contraseña por completo. Solo podrás entrar con "Iniciar sesión con Google" de ahora en adelante. ¿Continuar?')) return
    setErr('')
    try {
      const { unlink } = await import('firebase/auth')
      await unlink(auth.currentUser, 'password')
      setUser({ ...auth.currentUser })
    } catch (e) {
      setErr('No se pudo quitar la contraseña.')
    }
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
          <button type="button" onClick={loginWithGoogle} className="h-12 rounded-lg border border-ink/20 font-semibold hover:bg-sand">Iniciar sesión con Google</button>
          <div className="flex items-center gap-3 text-xs text-ink/40 uppercase"><span className="h-px flex-1 bg-ink/10" />o<span className="h-px flex-1 bg-ink/10" /></div>
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
  const hasGoogle = user.providerData?.some((p) => p.providerId === 'google.com')
  const hasPassword = user.providerData?.some((p) => p.providerId === 'password')

  return (
    <Shell right={
      <div className="flex items-center gap-3">
        <AdminSearch goTo={goToTab} />
        <button onClick={toggleAdminLang} title="Selector de idioma (próximamente disponible para todo el panel)" className="text-sm font-semibold hover:text-gold whitespace-nowrap">{adminLang.toUpperCase()} / {adminLang === 'es' ? 'EN' : 'ES'}</button>
        <button onClick={logout} className="text-sm font-semibold hover:text-gold whitespace-nowrap">Salir</button>
      </div>
    }>
      {/* Aparece solo mientras la cuenta todavía tiene contraseña — guía para
          pasar a un inicio de sesión sin contraseña (Google, con el 2FA que
          ya tenga esa cuenta de Google). Desaparece sola una vez que se
          quita la contraseña. */}
      {hasPassword && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm flex flex-wrap items-center gap-3 justify-between">
          <p className="text-ink/80">{hasGoogle
            ? 'Tu cuenta de Google ya está vinculada. Por seguridad, considera quitar la contraseña.'
            : 'Recomendado: vincula tu cuenta de Google para iniciar sesión sin contraseña.'}</p>
          <div className="flex gap-2 shrink-0">
            {!hasGoogle && <button onClick={linkGoogle} className="h-9 px-3 rounded-lg bg-ink text-gold text-xs font-bold">Vincular Google</button>}
            {hasGoogle && <button onClick={unlinkPassword} className="h-9 px-3 rounded-lg border border-red-700 text-red-700 text-xs font-bold">Quitar contraseña</button>}
          </div>
        </div>
      )}
      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}
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
