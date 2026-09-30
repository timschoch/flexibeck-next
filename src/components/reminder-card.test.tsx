// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { plans } from '../test/fixtures'
import { render } from '../test/render'
import { ReminderCard } from './reminder-card'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

const [plan] = plans
const handsOnSteps = plan!.steps.filter((step) => step.presence === 'hands-on')

describe('ReminderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the next hands-on step with its time', () => {
    render(<ReminderCard steps={plan!.steps} />)

    expect(screen.getByRole('heading', { name: handsOnSteps[0]!.name })).toBeDefined()
    expect(screen.getByText(/Mon 06:00/)).toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })

  it('fires first_reminder_done once, on the first step only', async () => {
    render(<ReminderCard steps={plan!.steps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('first_reminder_done')
    expect(screen.getByRole('heading', { name: handsOnSteps[1]!.name })).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(track).toHaveBeenCalledTimes(1)
  })

  it('tells its parent once that the first reminder is done', async () => {
    const onFirstDone = vi.fn()
    render(<ReminderCard steps={plan!.steps} onFirstDone={onFirstDone} />)

    expect(onFirstDone).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onFirstDone).toHaveBeenCalledTimes(1)
  })

  it('shows the creator video as a figure that loads nothing before the play click', () => {
    render(<ReminderCard steps={plan!.steps} />)

    expect(screen.getByRole('figure', { name: 'Mix flour and water, Marcel Paa' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Play video: Mix flour and water' })).toBeDefined()
    expect(document.querySelector('iframe')).toBeNull()
    for (const element of document.querySelectorAll('[src]')) {
      expect(element.getAttribute('src')).not.toMatch(/youtube|ytimg/)
    }
  })

  it('plays the video in a youtube-nocookie iframe at the chapter of the step after the click', async () => {
    render(<ReminderCard steps={plan!.steps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Play video: Mix flour and water' }))

    const player = document.querySelector('iframe')
    expect(player?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/K4TdJsa1voI?start=29&autoplay=1')
    expect(player?.getAttribute('title')).toBe('Mix flour and water, Marcel Paa')
    expect(screen.queryByRole('button', { name: /^Play video/ })).toBeNull()
  })

  it('shows the next step with its own player unloaded', async () => {
    render(<ReminderCard steps={plan!.steps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Play video: Mix flour and water' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'Play video: Mix in salt and sourdough' })).toBeDefined()
  })

  it('shows no video for a step without a creator video', () => {
    render(<ReminderCard steps={[{ ...handsOnSteps[0]!, stepId: 'no-such-step' }]} />)

    expect(screen.queryByRole('figure')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Play video/ })).toBeNull()
  })

  it('shows the cue of a check', async () => {
    const check = { ...handsOnSteps[0]!, kind: 'check' as const, cue: 'The dough grew by half' }
    render(<ReminderCard steps={[check]} />)

    expect(screen.getByText(/The dough grew by half/)).toBeDefined()
  })

  it('says so when every hands-on step is done', async () => {
    render(<ReminderCard steps={[handsOnSteps[0]!]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByText(/Every hands-on step is done/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
  })
})
