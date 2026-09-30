import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

// A Saturday at 08:00, the start of the default weekend block, so "Start now" finds plans at any time the suite runs.
test.use({ timezoneId: 'UTC' })
const SATURDAY_MORNING = new Date('2026-10-10T08:00:00Z')
/** The hands-on techniques of Sauerteig Basic Brot, as written and with the four-hour method. */
const TECHNIQUES = ['Autolyse', 'Mix', 'Stretch and fold', 'Shape']

test('a baker plans a bake, accepts a hack plan, marks the first reminder done and answers the survey @smoke', async ({ page }) => {
  await page.clock.setFixedTime(SATURDAY_MORNING)
  const youtubeRequests: string[] = []
  page.on('request', (request) => {
    if (/youtube|ytimg/.test(new URL(request.url()).hostname)) youtubeRequests.push(request.url())
  })

  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Baker')
  await page.getByRole('textbox', { name: 'Email' }).fill(`baker-${randomUUID()}@example.com`)
  await page.getByLabel(/^Password/).fill(randomUUID())
  await page.getByRole('radiogroup', { name: /^How much baking experience do you have\?/ }).getByRole('radio', { name: 'Novice' }).check()
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
  await expect(page.getByText('Step 1 of 5')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import (coming soon)' })).toBeDisabled()
  await page.getByRole('button', { name: 'Sauerteig Basic Brot' }).click()

  await expect(page.getByRole('heading', { name: 'Your availability' })).toBeVisible()
  await expect(page.getByText('Step 2 of 5')).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Monday block 1 start hour' })).toHaveValue('06')
  await expect(page.getByRole('spinbutton', { name: 'Monday block 2 start hour' })).toHaveValue('17')
  await expect(page.getByRole('spinbutton', { name: 'Saturday block 1 end hour' })).toHaveValue('22')
  await expect(page.locator('[required]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Save availability' }).click()

  await expect(page.getByRole('heading', { name: 'When do you bake?' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Start now' })).toBeChecked()
  await page.getByRole('button', { name: 'Show plans' }).click()

  await expect(page.getByRole('heading', { name: 'Your plans' })).toBeVisible()
  const firstPlan = page.getByRole('region', { name: 'Plan 1' })
  await expect(firstPlan.getByText('The recipe as written, no hacks')).toBeVisible()
  // The plan list names techniques: one figure for each, none twice.
  const planListDemos = page.getByRole('region', { name: 'How it is done' })
  await expect(planListDemos.getByRole('figure')).toHaveCount(TECHNIQUES.length)
  for (const technique of TECHNIQUES) {
    await expect(page.getByRole('figure', { name: `${technique}, Marcel Paa`, exact: true })).toHaveCount(1)
  }
  const hackPlan = page.getByRole('region', { name: 'Plan 2' })
  await expect(hackPlan.getByText('4-hour bread with yeast')).toBeVisible()
  await hackPlan.getByRole('button', { name: 'Accept this plan' }).click()

  await expect(page).toHaveURL(/\/bake-plans\/[\w-]+$/)
  await expect(page.getByRole('heading', { name: 'Your bake' })).toBeVisible()
  await expect(page.getByText('Step 5 of 5')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mix flour and water' })).toBeVisible()
  const stepCard = page.getByRole('region', { name: 'Mix flour and water' })
  await expect(stepCard.getByRole('figure', { name: 'Autolyse, Marcel Paa' })).toBeVisible()
  // The bake page shows every technique of the hack plan, not only the next step's.
  const bakeDemos = page.getByRole('region', { name: 'How it is done' })
  await expect(bakeDemos.getByRole('figure')).toHaveCount(TECHNIQUES.length)
  for (const technique of TECHNIQUES) {
    await expect(bakeDemos.getByRole('figure', { name: `${technique}, Marcel Paa`, exact: true })).toBeVisible()
  }
  await expect(page.locator('iframe')).toHaveCount(0)
  expect(youtubeRequests).toEqual([])
  await stepCard.getByRole('button', { name: 'Play video: Autolyse' }).click()
  await expect(stepCard.locator('iframe[title="Autolyse, Marcel Paa"]')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/K4TdJsa1voI?start=29&autoplay=1',
  )
  await page.getByRole('button', { name: 'Done' }).click()
  // The next step is a step of the hack: it opens the video of the four-hour method.
  const hackStepCard = page.getByRole('region', { name: 'Mix', exact: true })
  await expect(hackStepCard.getByRole('heading', { name: 'Mix', exact: true })).toBeVisible()
  await expect(hackStepCard.locator('iframe')).toHaveCount(0)
  await hackStepCard.getByRole('button', { name: 'Play video: Mix', exact: true }).click()
  await expect(hackStepCard.locator('iframe[title="Mix, Marcel Paa"]')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/ZdIlvbulBA8?start=10&autoplay=1',
  )

  const scale = page.getByRole('radiogroup', { name: /^How easy was your first bake\?/ })
  await expect(scale.getByRole('radio')).toHaveCount(7)
  await scale.getByRole('radio', { name: '6' }).check()
  await page.getByRole('textbox', { name: 'What was hard?' }).fill('Nothing so far')
  await page.getByRole('button', { name: 'Send answer' }).click()
  await expect(page.getByText('Thank you')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send answer' })).toHaveCount(0)
})

test('the availability a baker saved is there the next time, and no plan is never a dead end @smoke', async ({ page }) => {
  await page.clock.setFixedTime(SATURDAY_MORNING)

  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Baker')
  await page.getByRole('textbox', { name: 'Email' }).fill(`baker-${randomUUID()}@example.com`)
  await page.getByLabel(/^Password/).fill(randomUUID())
  await page.getByRole('radio', { name: 'Experienced' }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('button', { name: 'Sauerteig Basic Brot' }).click()

  // Saturday goes away and Monday starts an hour later: a bake that starts now no longer fits.
  await page.getByRole('button', { name: 'Remove Saturday block 1' }).click()
  await page.getByRole('spinbutton', { name: 'Monday block 1 start hour' }).fill('7')
  await page.getByRole('button', { name: 'Save availability' }).click()
  await page.getByRole('button', { name: 'Show plans' }).click()

  await expect(page.getByText('No plan fits your availability')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Closest plan' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'How it is done' }).getByRole('figure')).toHaveCount(TECHNIQUES.length)
  await page.getByRole('button', { name: 'Change availability' }).click()

  await expect(page.getByRole('heading', { name: 'Your availability' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Saturday' }).getByText('Not available')).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Saturday block 1 start hour' })).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: 'Monday block 1 start hour' })).toHaveValue('07')
})
