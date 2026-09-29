import { useEffect, useState } from 'react'
import { auth, db, isConfigured } from '../firebase'
import Icon from './Icon'
import logo from '../assets/photos/logo-white.webp'
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

const HDR_BTN = 'h-9 px-3.5 rounded-full border border-white/25 text-sm font-semibold text-white/90 hover:bg-white/10 hover:border-white/50 whitespace-nowrap transition-colors'

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
  const [showAccount, setShowAccount] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

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
        setErr(e?.code === 'auth/admin-restricted-operation'
          ? 'Esta cuenta de Google no está registrada en el panel. Pide acceso al administrador.'
          : `No se pudo iniciar sesión con Google${e?.code ? ` (${e.code})` : ''}.`)
      }
    }
  }

  // Firebase requires a "recent" login (roughly the last few minutes) for
  // sensitive account changes like linking a provider or removing the
  // password — an old, still-valid session isn't enough. When linkGoogle or
  // unlinkPassword below hit that wall (auth/requires-recent-login), this
  // re-proves the user's identity (via whichever method the account already
  // has) and the caller retries the original action once it succeeds.
  async function reauthenticate() {
    const hasGoogleNow = auth.currentUser.providerData.some((p) => p.providerId === 'google.com')
    if (hasGoogleNow) {
      const { GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth')
      await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider())
      return
    }
    const password = window.prompt('Por seguridad, confirma tu contraseña actual para continuar:')
    if (!password) throw { code: 'auth/popup-closed-by-user' }
    const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, password))
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
      if (e?.code === 'auth/requires-recent-login') {
        try {
          await reauthenticate()
          const { GoogleAuthProvider, linkWithPopup } = await import('firebase/auth')
          await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
          setUser({ ...auth.currentUser })
        } catch {
          setErr('No se pudo confirmar tu identidad. Intenta de nuevo.')
        }
      } else if (e?.code === 'auth/credential-already-in-use') {
        setErr('Esa cuenta de Google ya está vinculada a otra cuenta.')
      } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setErr('No se pudo vincular la cuenta de Google.')
      }
    }
  }

  // Once Google is linked, this removes the password as a way in — from
  // then on the only way to reach this account is Google Sign-In, which
  // carries whatever 2FA is already active on that Google account. The
  // "Quitar contraseña" button is only ever shown once Google is already
  // linked (see hasPassword/hasGoogle below), so Google always remains as
  // a working recovery method — this can never leave the account with no
  // way in at all.
  async function unlinkPassword() {
    if (!confirm('Esto quita la contraseña por completo. Solo podrás entrar con "Iniciar sesión con Google" de ahora en adelante. ¿Continuar?')) return
    setErr('')
    try {
      const { unlink } = await import('firebase/auth')
      await unlink(auth.currentUser, 'password')
      setUser({ ...auth.currentUser })
    } catch (e) {
      if (e?.code === 'auth/requires-recent-login') {
        try {
          await reauthenticate()
          const { unlink } = await import('firebase/auth')
          await unlink(auth.currentUser, 'password')
          setUser({ ...auth.currentUser })
        } catch {
          setErr('No se pudo confirmar tu identidad. Intenta de nuevo.')
        }
      } else {
        setErr('No se pudo quitar la contraseña.')
      }
    }
  }

  // Lets the signed-in admin set a new password from the panel. With a
  // password already on the account it re-proves identity with the current
  // one (Firebase demands a recent login for this); with a Google-only
  // account it *creates* a password by linking the email/password provider,
  // so the client can also sign in without Google if they ever want to.
  async function changePassword(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const current = f.get('current') || ''
    const next = f.get('next') || ''
    const confirmPw = f.get('confirm') || ''
    setPwMsg('')
    if (next.length < 8) { setPwMsg('La contraseña nueva debe tener al menos 8 caracteres.'); return }
    if (next !== confirmPw) { setPwMsg('Las contraseñas nuevas no coinciden.'); return }
    setPwBusy(true)
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword, linkWithCredential } = await import('firebase/auth')
      const u = auth.currentUser
      const hasPw = u.providerData.some((p) => p.providerId === 'password')
      if (hasPw) {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current))
        await updatePassword(u, next)
      } else {
        try {
          await linkWithCredential(u, EmailAuthProvider.credential(u.email, next))
        } catch (e2) {
          if (e2?.code !== 'auth/requires-recent-login') throw e2
          await reauthenticate()
          await linkWithCredential(u, EmailAuthProvider.credential(u.email, next))
        }
      }
      setUser({ ...auth.currentUser })
      e.target.reset()
      setPwMsg(hasPw ? 'Contraseña actualizada.' : 'Contraseña creada. Ya puedes entrar con correo y contraseña.')
    } catch (e2) {
      const code = e2?.code || ''
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') setPwMsg('La contraseña actual no es correcta.')
      else if (code === 'auth/weak-password') setPwMsg('La contraseña nueva es demasiado débil.')
      else if (code === 'auth/too-many-requests') setPwMsg('Demasiados intentos. Espera unos minutos.')
      else if (code === 'auth/popup-closed-by-user') setPwMsg('No se confirmó la identidad.')
      else if (code === 'auth/admin-restricted-operation') setPwMsg('El panel no permite crear contraseñas nuevas; pídela a SistemasKV.')
      else setPwMsg(`No se pudo cambiar la contraseña${code ? ` (${code})` : ''}.`)
    } finally {
      setPwBusy(false)
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
        <button onClick={toggleAdminLang} title="Selector de idioma (próximamente disponible para todo el panel)" className={HDR_BTN}>{adminLang.toUpperCase()} / {adminLang === 'es' ? 'EN' : 'ES'}</button>
        <button onClick={() => { setShowAccount((v) => !v); setPwMsg('') }} className={`${HDR_BTN} ${showAccount ? 'bg-gold text-ink border-gold hover:bg-gold' : ''}`}>Mi cuenta</button>
        <button onClick={logout} className={HDR_BTN}>Salir</button>
      </div>
    }>
      {/* Aparece solo mientras la cuenta todavía tiene contraseña — guía para
          pasar a un inicio de sesión sin contraseña (Google, con el 2FA que
          ya tenga esa cuenta de Google). Desaparece sola una vez que se
          quita la contraseña. */}
      {showAccount && (
        <section className="mb-6 rounded-2xl bg-white border border-ink/10 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-ink text-lg">Mi cuenta</h2>
              <p className="text-sm text-ink/70 mt-1">{user.email}</p>
              <p className="text-xs text-ink/50 mt-1">
                Formas de entrar: {[hasGoogle && 'Google', hasPassword && 'correo y contraseña'].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <button onClick={() => setShowAccount(false)} className="text-sm text-ink/60 hover:text-ink">Cerrar</button>
          </div>
          {!hasPassword && (
            <p className="mt-4 text-sm text-ink/70 max-w-2xl">Esta cuenta entra solo con Google (con la verificación en dos pasos de esa cuenta). Si quieres además una contraseña, pídela a SistemasKV: por seguridad, el panel no permite crear contraseñas nuevas desde el navegador.</p>
          )}
          {hasPassword && (
          <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-3 max-w-2xl">
            {hasPassword && (
              <label className="text-xs font-semibold text-ink/70 grid gap-1">Contraseña actual
                <input name="current" type="password" autoComplete="current-password" required className="h-10 rounded-lg border border-ink/15 px-3 text-sm font-normal" />
              </label>
            )}
            <label className="text-xs font-semibold text-ink/70 grid gap-1">{hasPassword ? 'Contraseña nueva' : 'Nueva contraseña'}
              <input name="next" type="password" autoComplete="new-password" minLength={8} required className="h-10 rounded-lg border border-ink/15 px-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-ink/70 grid gap-1">Repetir contraseña
              <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-10 rounded-lg border border-ink/15 px-3 text-sm font-normal" />
            </label>
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pwBusy} className="h-10 px-4 rounded-lg bg-ink text-gold text-sm font-bold disabled:opacity-50">
                {pwBusy ? 'Guardando…' : hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
              </button>
              {pwMsg && <p className={`text-sm ${pwMsg.startsWith('Contraseña ') ? 'text-green-700' : 'text-red-700'}`}>{pwMsg}</p>}
            </div>
            <p className="sm:col-span-3 text-xs text-ink/50">Mínimo 8 caracteres. {hasGoogle ? 'Entrar con Google seguirá funcionando igual.' : 'Recomendado: vincula también tu cuenta de Google para entrar sin contraseña.'}</p>
          </form>
          )}
          {hasPassword && hasGoogle && (
            <div className="mt-5 pt-4 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink/60 max-w-xl">Opcional: si prefieres entrar solo con Google (con su verificación en dos pasos), puedes quitar la contraseña. Después solo SistemasKV podría volver a crearla.</p>
              <button onClick={unlinkPassword} className="h-9 px-3 rounded-lg border border-red-700 text-red-700 text-xs font-bold shrink-0">Quitar contraseña</button>
            </div>
          )}
          {hasPassword && !hasGoogle && (
            <div className="mt-5 pt-4 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink/60 max-w-xl">Vincula tu cuenta de Google para poder entrar también sin contraseña.</p>
              <button onClick={linkGoogle} className="h-9 px-3 rounded-lg bg-ink text-gold text-xs font-bold shrink-0">Vincular Google</button>
            </div>
          )}
        </section>
      )}
      {hasPassword && !hasGoogle && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm flex flex-wrap items-center gap-3 justify-between">
          <p className="text-ink/80">Recomendado: vincula tu cuenta de Google para iniciar sesión sin contraseña.</p>
          <button onClick={linkGoogle} className="h-9 px-3 rounded-lg bg-ink text-gold text-xs font-bold shrink-0">Vincular Google</button>
        </div>
      )}
      {err && <p className="mb-4 text-sm text-red-700">{err}</p>}
      <div className="flex items-center gap-1 mb-8 border-b border-ink/10 overflow-x-auto overflow-y-hidden flex-nowrap">
        {TABS.map((t) => <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</TabBtn>)}
      </div>
      <Active goTo={goToTab} focus={nav} onFocusHandled={clearNav} userEmail={user.email} />
    </Shell>
  )
}

function Shell({ children, right }) {
  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-[#022e5f] text-white h-20 flex items-center">
        <div className="mx-auto max-w-5xl w-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <a href="/admin" className="flex items-center gap-2.5 shrink-0" aria-label="Panel de administración">
              <img src={logo} alt="Gutierrez General Services" className="h-12 w-auto" />
              <span className="display font-bold text-lg tracking-wide hidden sm:inline text-gold">Admin</span>
            </a>
            <a href="/" className="text-xs font-semibold text-white/70 hover:text-gold whitespace-nowrap flex items-center gap-1"><Icon name="arrowRight" size={14} className="rotate-180" /> Volver al sitio</a>
          </div>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
