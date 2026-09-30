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

  it('links the creator video of the step, opened in a new tab', () => {
    render(<ReminderCard steps={plan!.steps} />)

    const link = screen.getByRole('link', { name: 'Watch how: Mix flour and water' })
    expect(link.getAttribute('href')).toBe('https://www.youtube.com/watch?v=K4TdJsa1voI&t=29s')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('shows no video link for a step without a creator video', () => {
    render(<ReminderCard steps={[{ ...handsOnSteps[0]!, stepId: 'no-such-step' }]} />)

    expect(screen.queryByRole('link', { name: /^Watch how/ })).toBeNull()
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
