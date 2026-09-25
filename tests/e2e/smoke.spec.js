import { test, expect } from '@playwright/test'

// These E2E tests run against the real Vite dev server and the REAL
// gutierrez-generalservices Firebase project (whatever is in your local .env).
// To keep that safe, none of these tests actually submit the quote form —
// that would write a fake lead into the client's live Firestore. Once the
// Firebase Emulator Suite is wired up (see project notes), add a follow-up
// spec that submits against the emulator and checks it lands in `quotes`.

test('homepage loads with the hero and can switch language', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Car.')
  await expect(page.getByText('Get a Free Quote').first()).toBeVisible()

  await page.getByRole('button', { name: 'Switch language' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Su carro.')

  // Language choice should survive a reload (saved to localStorage).
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Su carro.')
})

test('quote form requires the key fields before it can be submitted', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Get a Free Quote' }).first().click()

  await page.getByRole('button', { name: 'Vehicle', exact: true }).click()
  await page.getByRole('button', { name: 'Get My Quote' }).click()

  // Submission should be blocked client-side — no success message, no Firestore write.
  await expect(page.getByText('Thank you! We received your request')).not.toBeVisible()
  await expect(page.getByLabel('Name')).toHaveJSProperty('validity.valid', false)
})

test('privacy and terms pages are reachable from the footer', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Privacy Policy' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy Policy')

  await page.goBack()
  await page.getByRole('link', { name: 'Terms of Service' }).click()
  await expect(page).toHaveURL(/\/terms$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Terms of Service')
})

test('an unknown URL shows the styled 404 page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page.getByText('404 error')).toBeVisible()
  await page.getByRole('link', { name: 'Back to home' }).click()
  await expect(page).toHaveURL('/')
})
