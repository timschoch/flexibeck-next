import { expect, test } from '@playwright/test'

test('home leads a visitor to sign in @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Flexibeck' })).toBeVisible()
  await page.getByRole('link', { name: 'Start planning' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
