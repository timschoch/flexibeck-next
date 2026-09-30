// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import type { AvailabilitySettings } from '../db/json-schemas'
import { defaultAvailability } from '../plan-flow/default-availability'
import { render } from '../test/render'
import { AvailabilityForm } from './availability-form'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

const emptyWeek: AvailabilitySettings['weekPlan'] = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

describe('AvailabilityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is prefilled with the given availability, in 24 h', () => {
    render(<AvailabilityForm initial={defaultAvailability} onSave={vi.fn()} />)

    expect(screen.getByRole('spinbutton', { name: 'Monday block 1 start hour' })).toHaveProperty('value', '06')
    expect(screen.getByRole('spinbutton', { name: 'Monday block 1 start minute' })).toHaveProperty('value', '00')
    expect(screen.getByRole('spinbutton', { name: 'Monday block 2 end hour' })).toHaveProperty('value', '22')
    expect(screen.getByRole('spinbutton', { name: 'Saturday block 1 end hour' })).toHaveProperty('value', '22')
  })

  it('requires nothing and continues with one primary button', () => {
    const { container } = render(<AvailabilityForm initial={defaultAvailability} onSave={vi.fn()} />)

    expect(container.querySelectorAll('[required]')).toHaveLength(0)
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Save availability' })).toHaveProperty('type', 'submit')
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
    // A small week keeps the tree small: the test clicks through it a few times.
    const smallWeek = {
      ...defaultAvailability,
      weekPlan: { ...emptyWeek, monday: defaultAvailability.weekPlan.monday, tuesday: defaultAvailability.weekPlan.tuesday },
    }
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<AvailabilityForm initial={smallWeek} onSave={onSave} />)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Monday block 1 start hour' }), { target: { value: '7' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Monday block 1 start minute' }), { target: { value: '30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Remove Tuesday block 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a block on Sunday' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a date' }))
    fireEvent.change(screen.getByLabelText(/^Date 1/), { target: { value: '2026-10-10' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Kitchen temperature (°C)' }), { target: { value: '21' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Fridge temperature (°C)' }), { target: { value: '5' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(onSave).toHaveBeenCalledWith({
      weekPlan: {
        ...emptyWeek,
        monday: [
          { start: '07:30', end: '08:00' },
          { start: '17:00', end: '22:00' },
        ],
        tuesday: [{ start: '06:00', end: '08:00' }],
        sunday: [{ start: '12:00', end: '13:00' }],
      },
      overrides: [{ date: '2026-10-10', blocks: [] }],
      kitchenTemperature: 21,
      fridgeTemperature: 5,
    })
  })

  it('says what is wrong and fires nothing when the availability is not valid', async () => {
    const onSave = vi.fn()
    render(<AvailabilityForm initial={defaultAvailability} onSave={onSave} />)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Monday block 1 end hour' }), { target: { value: '6' } })
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
