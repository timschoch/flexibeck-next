import { describe, expect, it } from 'vitest'
import { availabilitySchema } from '../db/json-schemas'
import { WEEKDAYS, defaultAvailability } from './default-availability'

describe('defaultAvailability', () => {
  it('is a typical week: before and after work on weekdays, the day on weekends', () => {
    for (const weekday of WEEKDAYS.slice(0, 5)) {
      expect(defaultAvailability.weekPlan[weekday]).toEqual([
        { start: '06:00', end: '08:00' },
        { start: '17:00', end: '22:00' },
      ])
    }
    for (const weekday of WEEKDAYS.slice(5)) {
      expect(defaultAvailability.weekPlan[weekday]).toEqual([{ start: '08:00', end: '22:00' }])
    }
    expect(defaultAvailability.overrides).toEqual([])
  })

  it('passes the schema that guards the availabilities table', () => {
    expect(availabilitySchema.parse(defaultAvailability)).toEqual(defaultAvailability)
  })
})
