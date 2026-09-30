// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { render } from '../test/render'
import { PlanModeForm } from './plan-mode-form'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

describe('PlanModeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires plan_mode_chosen once with start-now, the default', async () => {
    const onChoose = vi.fn()
    render(<PlanModeForm onChoose={onChoose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Show plans' }))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plan_mode_chosen', { mode: 'start-now' })
    expect(onChoose).toHaveBeenCalledWith({ mode: 'start-now' })
  })

  it('fires plan_mode_chosen with ready-by and hands over the finish time', async () => {
    const onChoose = vi.fn()
    render(<PlanModeForm onChoose={onChoose} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Ready by' }))
    fireEvent.change(screen.getByLabelText(/^Bread ready by/), { target: { value: '2026-10-07T18:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Show plans' }))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('plan_mode_chosen', { mode: 'ready-by' })
    expect(onChoose).toHaveBeenCalledWith({ mode: 'ready-by', finish: '2026-10-07T18:00' })
  })

  it('shows the date-time field only for ready-by', () => {
    render(<PlanModeForm onChoose={vi.fn()} />)

    expect(screen.queryByLabelText(/^Bread ready by/)).toBeNull()
  })
})
