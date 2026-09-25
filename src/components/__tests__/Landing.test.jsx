import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Landing from '../Landing'

// Landing renders QuoteForm, which needs ../firebase — keep this test isolated
// from the real Firebase project.
vi.mock('../../firebase', () => ({
  db: {},
  auth: {},
  isConfigured: false,
}))

beforeEach(() => {
  localStorage.clear()
})

describe('Landing', () => {
  it('renders the English hero copy when lang="en"', () => {
    render(<Landing lang="en" setLang={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Car.Your Home.Taken Care Of.')
    // Appears twice by design (hero button + final CTA button).
    expect(screen.getAllByText('Get a Free Quote').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the Spanish hero copy when lang="es"', () => {
    render(<Landing lang="es" setLang={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Su carro.Su casa.Bien cuidados.')
  })

  it('calls setLang with the other language when the switcher is clicked', async () => {
    const setLang = vi.fn()
    render(<Landing lang="en" setLang={setLang} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Switch language' }))
    expect(setLang).toHaveBeenCalledWith('es')
  })

  it('links the footer to the privacy and terms pages', () => {
    render(<Landing lang="en" setLang={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
  })
})
