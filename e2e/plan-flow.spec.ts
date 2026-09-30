import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

// A Monday at 06:00, inside the default availability, so "Start now" finds plans at any time the suite runs.
test.use({ timezoneId: 'UTC' })
const MONDAY_MORNING = new Date('2026-10-05T06:00:00Z')

test('a baker plans a bake, accepts plan 1 and marks the first reminder done @smoke', async ({ page }) => {
  await page.clock.setFixedTime(MONDAY_MORNING)

  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Baker')
  await page.getByRole('textbox', { name: 'Email' }).fill(`baker-${randomUUID()}@example.com`)
  await page.getByLabel(/^Password/).fill(randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
  await expect(page.getByText('Step 1 of 5')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import (coming soon)' })).toBeDisabled()
  await page.getByRole('button', { name: 'Sauerteig Basic Brot' }).click()

  await expect(page.getByRole('heading', { name: 'Your availability' })).toBeVisible()
  await expect(page.getByText('Step 2 of 5')).toBeVisible()
  await expect(page.getByLabel('Monday block 1 from')).toHaveValue('06:00')
  await expect(page.getByLabel('Monday block 2 to')).toHaveValue('22:00')
  await page.getByRole('button', { name: 'Save availability' }).click()

  await expect(page.getByRole('heading', { name: 'When do you bake?' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Start now' })).toBeChecked()
  await page.getByRole('button', { name: 'Show plans' }).click()

  await expect(page.getByRole('heading', { name: 'Your plans' })).toBeVisible()
  const firstPlan = page.getByRole('region', { name: 'Plan 1' })
  await expect(firstPlan.getByText('The recipe as written, no hacks')).toBeVisible()
  await firstPlan.getByRole('button', { name: 'Accept this plan' }).click()

  await expect(page).toHaveURL(/\/bake-plans\/[\w-]+$/)
  await expect(page.getByRole('heading', { name: 'Your bake' })).toBeVisible()
  await expect(page.getByText('Step 5 of 5')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mix flour and water' })).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('heading', { name: 'Mix in salt and sourdough' })).toBeVisible()
})

test('the availability a baker saved is there the next time, and no plan is never a dead end @smoke', async ({ page }) => {
  await page.clock.setFixedTime(MONDAY_MORNING)

  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Baker')
  await page.getByRole('textbox', { name: 'Email' }).fill(`baker-${randomUUID()}@example.com`)
  await page.getByLabel(/^Password/).fill(randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('button', { name: 'Sauerteig Basic Brot' }).click()

  // Monday morning goes away: a bake that starts now no longer fits.
  await page.getByRole('button', { name: 'Remove Monday block 1' }).click()
  await page.getByRole('button', { name: 'Save availability' }).click()
  await page.getByRole('button', { name: 'Show plans' }).click()

  await expect(page.getByText('No plan fits your availability')).toBeVisible()
  await page.getByRole('button', { name: 'Change availability' }).click()

  await expect(page.getByRole('heading', { name: 'Your availability' })).toBeVisible()
  await expect(page.getByLabel('Monday block 1 from')).toHaveValue('16:00')
  await expect(page.getByLabel('Monday block 2 from')).toHaveCount(0)
})
