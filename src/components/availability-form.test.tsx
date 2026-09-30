// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { defaultAvailability } from '../plan-flow/default-availability'
import { render } from '../test/render'
import { AvailabilityForm } from './availability-form'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

describe('AvailabilityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is prefilled with the given availability', () => {
    render(<AvailabilityForm initial={defaultAvailability} onSave={vi.fn()} />)

    expect(screen.getByLabelText('Monday block 1 from')).toHaveProperty('value', '06:00')
    expect(screen.getByLabelText('Monday block 2 to')).toHaveProperty('value', '22:00')
  })

  it('saves, then fires availability_set once', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<AvailabilityForm initial={defaultAvailability} onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(onSave).toHaveBeenCalledWith(defaultAvailability)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('availability_set')
  })

  it('saves changed blocks, a date override and the temperatures', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<AvailabilityForm initial={defaultAvailability} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Monday block 1 from'), { target: { value: '07:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tuesday block 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a date' }))
    fireEvent.change(screen.getByLabelText(/^Date 1/), { target: { value: '2026-10-10' } })
    await userEvent.type(screen.getByRole('textbox', { name: 'Kitchen temperature (°C)' }), '21')
    await userEvent.type(screen.getByRole('textbox', { name: 'Fridge temperature (°C)' }), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(onSave).toHaveBeenCalledWith({
      weekPlan: {
        ...defaultAvailability.weekPlan,
        monday: [
          { start: '07:00', end: '10:00' },
          { start: '16:00', end: '22:00' },
        ],
        tuesday: [{ start: '06:00', end: '10:00' }],
      },
      overrides: [{ date: '2026-10-10', blocks: [] }],
      kitchenTemperature: 21,
      fridgeTemperature: 5,
    })
  })

  it('says what is wrong and fires nothing when the availability is not valid', async () => {
    const onSave = vi.fn()
    render(<AvailabilityForm initial={defaultAvailability} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Monday block 1 to'), { target: { value: '06:00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(onSave).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('fires nothing when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'))
    render(<AvailabilityForm initial={defaultAvailability} onSave={onSave} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })
})
