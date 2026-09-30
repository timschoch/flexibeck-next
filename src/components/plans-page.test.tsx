// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { defaultAvailability } from '../plan-flow/default-availability'
import { formatDayTime } from '../plan-flow/local-time'
import { fourHourPlan, plans } from '../test/fixtures'
import { render } from '../test/render'
import { PlansPage } from './plans-page'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

function listFigureNames(): (string | null | undefined)[] {
  return screen.queryAllByRole('figure').map((figure) => figure.querySelector('figcaption')?.textContent)
}

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires plans_shown once with the number of plans', () => {
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)

    expect(plans.length).toBe(3)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plans_shown', { count: 3 })
  })

  it('shows each plan with its hacks and one accept button', () => {
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)

    const first = screen.getByRole('region', { name: 'Plan 1' })
    expect(within(first).getByText('The recipe as written, no hacks')).toBeDefined()
    expect(within(first).getByRole('button', { name: 'Accept this plan' })).toBeDefined()
    const second = screen.getByRole('region', { name: 'Plan 2' })
    expect(within(second).getByText('Cold bulk, short warm proof')).toBeDefined()
    expect(within(second).getByText(/The cold bulk aroma/)).toBeDefined()
  })

  it('saves the accepted plan, then fires plan_accepted once with its rank and hacks', async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined)
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={onAccept} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)
    vi.mocked(track).mockClear()

    const second = screen.getByRole('region', { name: 'Plan 2' })
    await userEvent.click(within(second).getByRole('button', { name: 'Accept this plan' }))

    expect(onAccept).toHaveBeenCalledWith(plans[1])
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plan_accepted', { rank: 2, hacks: ['cold-bulk-short-proof'] })
  })

  it('fires nothing when the save fails', async () => {
    const onAccept = vi.fn().mockRejectedValue(new Error('offline'))
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={onAccept} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)
    vi.mocked(track).mockClear()

    const first = screen.getByRole('region', { name: 'Plan 1' })
    await userEvent.click(within(first).getByRole('button', { name: 'Accept this plan' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })

  it('says that no plan fits and offers to change the availability', async () => {
    const onChangeAvailability = vi.fn()
    render(<PlansPage plans={[]} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={onChangeAvailability} />)

    expect(screen.getByText(/No plan fits/)).toBeDefined()
    expect(track).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Change availability' }))
    expect(onChangeAvailability).toHaveBeenCalled()
  })

  it('shows the closest plan and applies its finish time with one button', async () => {
    const closest = plans[0]
    if (!closest) throw new Error('no plan')
    const onChooseFinish = vi.fn()
    render(
      <PlansPage
        plans={[]}
        closest={closest}
        availability={defaultAvailability}
        onAccept={vi.fn()}
        onChooseFinish={onChooseFinish}
        onChangeAvailability={vi.fn()}
      />,
    )

    expect(screen.getByText(/No plan fits/)).toBeDefined()
    const card = screen.getByRole('region', { name: 'Closest plan' })
    expect(within(card).queryByRole('button', { name: 'Accept this plan' })).toBeNull()
    await userEvent.click(within(card).getByRole('button', { name: `Plan bread ready by ${formatDayTime(closest.finish)}` }))
    expect(onChooseFinish).toHaveBeenCalledWith(closest.finish)
  })

  it('shows how each technique of the plans is done: one figure per technique, none twice, nothing loaded', () => {
    render(<PlansPage plans={plans} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)

    const section = screen.getByRole('region', { name: 'How it is done' })
    expect(within(section).getAllByRole('figure')).toHaveLength(4)
    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('shows the figures of a hack plan', async () => {
    render(
      <PlansPage plans={[fourHourPlan]} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />,
    )

    expect(within(screen.getByRole('region', { name: 'Plan 1' })).getByText('4-hour bread with yeast')).toBeDefined()
    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
    await userEvent.click(screen.getByRole('button', { name: 'Play video: Mix' }))
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/ZdIlvbulBA8?start=10&autoplay=1')
  })

  it('shows how the techniques of the closest plan are done', () => {
    render(
      <PlansPage
        plans={[]}
        closest={fourHourPlan}
        availability={defaultAvailability}
        onAccept={vi.fn()}
        onChooseFinish={vi.fn()}
        onChangeAvailability={vi.fn()}
      />,
    )

    expect(screen.getByRole('region', { name: 'Closest plan' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'How it is done' })).toBeDefined()
    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
  })

  it('shows no figure when there is no plan to show', () => {
    render(<PlansPage plans={[]} availability={defaultAvailability} onAccept={vi.fn()} onChooseFinish={vi.fn()} onChangeAvailability={vi.fn()} />)

    expect(screen.queryByRole('region', { name: 'How it is done' })).toBeNull()
    expect(listFigureNames()).toEqual([])
  })
})
