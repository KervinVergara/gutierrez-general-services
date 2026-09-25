import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuoteForm from '../QuoteForm'
import { content } from '../../content'

// QuoteForm only needs `functions` and `isConfigured` from ../firebase — mock
// them so tests never touch the real Firebase project.
vi.mock('../../firebase', () => ({
  functions: {},
  isConfigured: true,
}))

const submitQuoteMock = vi.fn()
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => (...args) => submitQuoteMock(...args)),
}))

const t = content.en.contact
const services = content.en.services

function setup() {
  return render(<QuoteForm t={t} services={services} lang="en" presetService="" presetType="" id="quote-form" />)
}

async function fillMinimumValidForm(user) {
  await user.click(screen.getByRole('button', { name: t.typeVehicle }))
  await user.selectOptions(screen.getByLabelText(t.service), services.find((s) => s.group === 'auto').id)
  await user.type(screen.getByLabelText(t.name), 'Jane Doe')
  await user.type(screen.getByLabelText(t.phone), '5741234567')
  await user.click(screen.getByLabelText(t.consent))
}

describe('QuoteForm', () => {
  beforeEach(() => {
    submitQuoteMock.mockReset()
  })

  it('only shows the detail fields after a service type is picked', async () => {
    setup()
    expect(screen.queryByLabelText(t.name)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.send })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: t.typeVehicle }))

    expect(screen.getByLabelText(t.name)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.send })).toBeInTheDocument()
  })

  it('marks name, phone and consent as required (invalid) when left empty', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: t.typeVehicle }))
    await user.selectOptions(screen.getByLabelText(t.service), services.find((s) => s.group === 'auto').id)

    // Deliberately leave name, phone and consent empty. jsdom (used by this
    // component test) does not enforce the browser's native "required" submit
    // block the way a real browser does — that full end-to-end block is
    // covered by the Playwright E2E test instead (tests/e2e/smoke.spec.js).
    // Here we only check that the fields are correctly marked invalid, which
    // is what makes that native blocking possible in a real browser.
    expect(screen.getByLabelText(t.name)).toBeInvalid()
    expect(screen.getByLabelText(t.phone)).toBeInvalid()
    expect(screen.getByLabelText(t.consent)).toBeInvalid()
  })

  it('shows a success screen once a valid quote is submitted', async () => {
    submitQuoteMock.mockResolvedValueOnce({ data: { ok: true, id: 'abc123' } })
    setup()
    const user = userEvent.setup()
    await fillMinimumValidForm(user)
    await user.click(screen.getByRole('button', { name: t.send }))

    await waitFor(() => expect(screen.getByText(t.ok)).toBeInTheDocument())
    expect(submitQuoteMock).toHaveBeenCalledTimes(1)
  })

  it('shows the phone-fallback error message if the save fails', async () => {
    submitQuoteMock.mockRejectedValueOnce(new Error('network down'))
    setup()
    const user = userEvent.setup()
    await fillMinimumValidForm(user)
    await user.click(screen.getByRole('button', { name: t.send }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(t.err)
  })

  it('sends the honeypot field to submitQuote, empty for a real user (never filled or seen)', async () => {
    submitQuoteMock.mockResolvedValueOnce({ data: { ok: true, id: 'abc123' } })
    setup()
    const user = userEvent.setup()
    await fillMinimumValidForm(user)
    await user.click(screen.getByRole('button', { name: t.send }))

    await waitFor(() => expect(submitQuoteMock).toHaveBeenCalledTimes(1))
    const payload = submitQuoteMock.mock.calls[0][0]
    expect(payload.website).toBe('')
    expect(payload).not.toHaveProperty('consent')
  })
})
