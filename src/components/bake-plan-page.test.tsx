// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { defaultAvailability } from '../plan-flow/default-availability'
import { formatDayTime } from '../plan-flow/local-time'
import { basicRecipe, fourHourPlan } from '../test/fixtures'
import { render } from '../test/render'
import { BakePlanPage } from './bake-plan-page'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

function renderPage() {
  render(<BakePlanPage recipeName={basicRecipe.name} plan={fourHourPlan} availability={defaultAvailability} experience="novice" />)
}

describe('BakePlanPage', () => {
  it('shows the recipe, the next hands-on step and the timeline with every step', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Your bake' })).toBeDefined()
    expect(screen.getByText(`Sauerteig Basic Brot. Bread ready ${formatDayTime(fourHourPlan.finish)}.`)).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Mix flour and water' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeDefined()
    expect(within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')).toHaveLength(fourHourPlan.steps.length)
  })

  it('shows how every technique of a hack plan is done, after the timeline', () => {
    renderPage()

    const section = screen.getByRole('region', { name: 'How it is done' })
    const names = within(section)
      .getAllByRole('figure')
      .map((figure) => figure.querySelector('figcaption')?.textContent)
    expect(names).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
    const timeline = screen.getByRole('img', { name: /^Timeline from/ })
    expect(timeline.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('repeats a figure only in the step card, for the technique of the next step', () => {
    renderPage()

    const stepCard = screen.getByRole('region', { name: 'Mix flour and water' })
    expect(within(stepCard).getByRole('figure', { name: 'Autolyse, Marcel Paa' })).toBeDefined()
    expect(screen.getAllByRole('figure')).toHaveLength(5)
  })

  it('asks the survey once the first reminder is done', async () => {
    renderPage()

    expect(screen.queryByRole('radiogroup', { name: /^How easy was your first bake\?/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('radiogroup', { name: /^How easy was your first bake\?/ })).toBeDefined()
  })
})
