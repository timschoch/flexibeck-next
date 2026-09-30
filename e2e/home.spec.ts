import { expect, test } from '@playwright/test'

test('home leads to the plan route @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Flexibeck' })).toBeVisible()
  await page.getByRole('link', { name: 'Start planning' }).click()
  await expect(page).toHaveURL(/\/plan$/)
  await expect(page.getByRole('heading', { name: 'Plan a bake' })).toBeVisible()
})
