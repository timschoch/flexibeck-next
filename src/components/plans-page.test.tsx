// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { defaultAvailability } from '../plan-flow/default-availability'
import { plans } from '../test/fixtures'
import { render } from '../test/render'
import { PlansPage } from './plans-page'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires plans_shown once with the number of plans', () => {
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={vi.fn()} onChangeAvailability={vi.fn()} />)

    expect(plans.length).toBe(3)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plans_shown', { count: 3 })
  })

  it('shows each plan with its hacks and one accept button', () => {
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={vi.fn()} onChangeAvailability={vi.fn()} />)

    const first = screen.getByRole('region', { name: 'Plan 1' })
    expect(within(first).getByText('The recipe as written, no hacks')).toBeDefined()
    expect(within(first).getByRole('button', { name: 'Accept this plan' })).toBeDefined()
    const second = screen.getByRole('region', { name: 'Plan 2' })
    expect(within(second).getByText('Cold bulk, about 60 h')).toBeDefined()
    expect(within(second).getByText('A superb aroma and better colour.')).toBeDefined()
  })

  it('saves the accepted plan, then fires plan_accepted once with its rank and hacks', async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined)
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={onAccept} onChangeAvailability={vi.fn()} />)
    vi.mocked(track).mockClear()

    const second = screen.getByRole('region', { name: 'Plan 2' })
    await userEvent.click(within(second).getByRole('button', { name: 'Accept this plan' }))

    expect(onAccept).toHaveBeenCalledWith(plans[1])
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plan_accepted', { rank: 2, hacks: ['cold-bulk'] })
  })

  it('fires nothing when the save fails', async () => {
    const onAccept = vi.fn().mockRejectedValue(new Error('offline'))
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={onAccept} onChangeAvailability={vi.fn()} />)
    vi.mocked(track).mockClear()

    const first = screen.getByRole('region', { name: 'Plan 1' })
    await userEvent.click(within(first).getByRole('button', { name: 'Accept this plan' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })

  it('says that no plan fits and offers to change the availability', async () => {
    const onChangeAvailability = vi.fn()
    render(<PlansPage plans={[]} availability={defaultAvailability} onAccept={vi.fn()} onChangeAvailability={onChangeAvailability} />)

    expect(screen.getByText(/No plan fits/)).toBeDefined()
    expect(track).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Change availability' }))
    expect(onChangeAvailability).toHaveBeenCalled()
  })
})
