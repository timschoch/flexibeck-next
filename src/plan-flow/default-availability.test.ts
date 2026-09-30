import { describe, expect, it } from 'vitest'
import { availabilitySchema } from '../db/json-schemas'
import { WEEKDAYS, defaultAvailability } from './default-availability'

describe('defaultAvailability', () => {
  it("is the vision's example on every weekday: 06 to 10 and 16 to 22", () => {
    for (const weekday of WEEKDAYS) {
      expect(defaultAvailability.weekPlan[weekday]).toEqual([
        { start: '06:00', end: '10:00' },
        { start: '16:00', end: '22:00' },
      ])
    }
    expect(defaultAvailability.overrides).toEqual([])
  })

  it('passes the schema that guards the availabilities table', () => {
    expect(availabilitySchema.parse(defaultAvailability)).toEqual(defaultAvailability)
  })
})
