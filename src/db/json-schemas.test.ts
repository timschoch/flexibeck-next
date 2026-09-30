import { describe, expect, it } from 'vitest'
import { availabilitySchema, bakePlanSchema } from './json-schemas'

const validAvailability = {
  weeklyWindows: [{ weekday: 1, start: '08:00', end: '12:30' }],
  overrides: [{ date: '2026-10-03', windows: [] }],
  kitchenTemperature: 22,
  fridgeTemperature: 4,
}

describe('availabilitySchema', () => {
  it('accepts weekly windows, overrides and temperatures', () => {
    expect(availabilitySchema.parse(validAvailability)).toEqual(validAvailability)
  })

  it('rejects a window that ends before it starts', () => {
    const result = availabilitySchema.safeParse({
      ...validAvailability,
      weeklyWindows: [{ weekday: 1, start: '12:00', end: '08:00' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a weekday outside 0 to 6', () => {
    const result = availabilitySchema.safeParse({
      ...validAvailability,
      weeklyWindows: [{ weekday: 7, start: '08:00', end: '09:00' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed time and a malformed override date', () => {
    expect(
      availabilitySchema.safeParse({
        ...validAvailability,
        weeklyWindows: [{ weekday: 1, start: '8am', end: '09:00' }],
      }).success,
    ).toBe(false)
    expect(
      availabilitySchema.safeParse({
        ...validAvailability,
        overrides: [{ date: '03.10.2026', windows: [] }],
      }).success,
    ).toBe(false)
  })

  it('rejects a temperature outside a kitchen or fridge range', () => {
    expect(availabilitySchema.safeParse({ ...validAvailability, kitchenTemperature: 80 }).success).toBe(false)
    expect(availabilitySchema.safeParse({ ...validAvailability, fridgeTemperature: -30 }).success).toBe(false)
  })
})

describe('bakePlanSchema', () => {
  it('accepts a plan object', () => {
    const plan = { steps: [{ name: 'mix', at: '2026-10-03T08:00:00.000Z' }] }
    expect(bakePlanSchema.parse(plan)).toEqual(plan)
  })

  it('rejects a plan that is not an object', () => {
    expect(bakePlanSchema.safeParse('plan').success).toBe(false)
    expect(bakePlanSchema.safeParse(null).success).toBe(false)
  })
})
