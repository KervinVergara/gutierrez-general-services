import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Admin from '../Admin'

vi.mock('../../firebase', () => ({
  auth: {},
  db: {},
  isConfigured: true,
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { cb(null); return () => {} },
  signInWithEmailAndPassword: vi.fn(),
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

describe('Admin — logged out', () => {
  it('shows only the login form and no client/CRM data when no session is active', async () => {
    render(<Admin />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Panel interno' })).toBeInTheDocument())
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()

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
    await waitFor(() => screen.getByRole('heading', { name: 'Panel interno' }))

    const user = (await import('@testing-library/user-event')).default.setup()
    await user.type(screen.getByLabelText('Correo'), 'staff@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument())
  })
})
