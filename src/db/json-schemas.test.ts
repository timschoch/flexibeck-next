import { describe, expect, it } from 'vitest'
import { plans } from '../test/fixtures'
import { availabilitySchema, bakePlanSchema } from './json-schemas'

const validAvailability = {
  weekPlan: {
    monday: [{ start: '08:00', end: '12:30' }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  },
  overrides: [{ date: '2026-10-03', blocks: [] }],
  kitchenTemperature: 22,
  fridgeTemperature: 4,
}

function withMonday(start: string, end: string) {
  return { ...validAvailability, weekPlan: { ...validAvailability.weekPlan, monday: [{ start, end }] } }
}

describe('availabilitySchema', () => {
  it('accepts a week plan, overrides and temperatures', () => {
    expect(availabilitySchema.parse(validAvailability)).toEqual(validAvailability)
  })

  it('accepts an availability without temperatures', () => {
    const { weekPlan, overrides } = validAvailability
    expect(availabilitySchema.parse({ weekPlan, overrides })).toEqual({ weekPlan, overrides })
  })

  it('accepts an availability block that goes past midnight', () => {
    expect(availabilitySchema.safeParse(withMonday('22:00', '01:00')).success).toBe(true)
  })

  it('rejects an availability block that starts and ends at the same time', () => {
    expect(availabilitySchema.safeParse(withMonday('08:00', '08:00')).success).toBe(false)
  })

  it('rejects a week plan that misses a weekday', () => {
    const { sunday: _, ...sixDays } = validAvailability.weekPlan
    expect(availabilitySchema.safeParse({ ...validAvailability, weekPlan: sixDays }).success).toBe(false)
  })

  it('rejects a malformed time and a malformed override date', () => {
    expect(availabilitySchema.safeParse(withMonday('8am', '09:00')).success).toBe(false)
    expect(
      availabilitySchema.safeParse({
        ...validAvailability,
        overrides: [{ date: '03.10.2026', blocks: [] }],
      }).success,
    ).toBe(false)
  })

  it('rejects a temperature outside a kitchen or fridge range', () => {
    expect(availabilitySchema.safeParse({ ...validAvailability, kitchenTemperature: 80 }).success).toBe(false)
    expect(availabilitySchema.safeParse({ ...validAvailability, fridgeTemperature: -30 }).success).toBe(false)
  })
})

describe('bakePlanSchema', () => {
  it("accepts the solver's plans unchanged", () => {
    for (const plan of plans) {
      expect(bakePlanSchema.parse(plan)).toEqual(plan)
    }
  })

  it('rejects a plan without steps and a plan that is not an object', () => {
    const { steps: _, ...withoutSteps } = plans[0]!
    expect(bakePlanSchema.safeParse(withoutSteps).success).toBe(false)
    expect(bakePlanSchema.safeParse('plan').success).toBe(false)
    expect(bakePlanSchema.safeParse(null).success).toBe(false)
  })
})
