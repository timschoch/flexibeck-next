import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('a baker signs up, signs out and signs in again @smoke', async ({ page }) => {
  const email = `baker-${randomUUID()}@example.com`
  const password = randomUUID()

  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Baker')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/plan$/)
  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/plan$/)
  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
})

test('plan sends a visitor without a session to sign in @smoke', async ({ page }) => {
  await page.goto('/plan')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
