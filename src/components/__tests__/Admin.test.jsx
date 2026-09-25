import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Admin from '../Admin'

vi.mock('../../firebase', () => ({
  auth: { currentUser: null },
  db: {},
  isConfigured: true,
}))

let authStateCallback = null

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { authStateCallback = cb; return () => {} },
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
  unlink: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))

function fakeUser(email, hasAdminClaim) {
  return {
    email,
    getIdTokenResult: vi.fn().mockResolvedValue({ claims: { admin: hasAdminClaim } }),
  }
}

describe('Admin — logged out', () => {
  it('shows only the login form and no client/CRM data when no session is active', async () => {
    render(<Admin />)
    await waitFor(() => expect(authStateCallback).not.toBeNull())
    authStateCallback(null)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Panel interno' })).toBeInTheDocument())
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeInTheDocument()

    // None of the internal tabs (which is where real client/job/finance data lives)
    // should ever render before a session exists.
    expect(screen.queryByText('Cotizaciones')).not.toBeInTheDocument()
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
    expect(screen.queryByText('Finanzas')).not.toBeInTheDocument()
  })

  it('shows an error message on a failed login attempt without leaking why', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    signInWithEmailAndPassword.mockRejectedValueOnce(new Error('auth/wrong-password'))

    render(<Admin />)
    await waitFor(() => expect(authStateCallback).not.toBeNull())
    authStateCallback(null)
    await waitFor(() => screen.getByRole('heading', { name: 'Panel interno' }))

    const user = (await import('@testing-library/user-event')).default.setup()
    await user.type(screen.getByLabelText('Correo'), 'staff@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument())
  })
})

describe('Admin — signed in without the admin custom claim', () => {
  it('blocks the panel and shows "Sin permisos" instead of any tab, even though a session exists', async () => {
    render(<Admin />)
    await waitFor(() => expect(authStateCallback).not.toBeNull())
    authStateCallback(fakeUser('random@example.com', false))

    await waitFor(() => expect(screen.getByText('Sin permisos')).toBeInTheDocument())
    expect(screen.queryByText('Cotizaciones')).not.toBeInTheDocument()
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
    expect(screen.queryByText('Finanzas')).not.toBeInTheDocument()
  })
})

describe('Admin — signed in with the admin custom claim', () => {
  it('shows the panel tabs', async () => {
    render(<Admin />)
    await waitFor(() => expect(authStateCallback).not.toBeNull())
    authStateCallback(fakeUser('gutierrezgeneralservicesllc@gmail.com', true))

    await waitFor(() => expect(screen.getByText('Cotizaciones')).toBeInTheDocument())
    expect(screen.getByText('Clientes')).toBeInTheDocument()
    expect(screen.getByText('Finanzas')).toBeInTheDocument()
    expect(screen.queryByText('Sin permisos')).not.toBeInTheDocument()
  })
})
