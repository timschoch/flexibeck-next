import type { AvailabilitySettings } from '../db/json-schemas'
import type { AvailabilityBlock, Weekday } from '../solver/types'

export const WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** Used for the plan while the baker has not set a kitchen temperature. The base recipes assume it. */
export const DEFAULT_KITCHEN_TEMPERATURE = 24

// A typical week (Glue D10): before and after a working day, and the whole day on the weekend.
const WORKDAY_BLOCKS: AvailabilityBlock[] = [
  { start: '06:00', end: '08:00' },
  { start: '17:00', end: '22:00' },
]
const WEEKEND_BLOCKS: AvailabilityBlock[] = [{ start: '08:00', end: '22:00' }]

/** What a baker sees before they saved an availability. They edit it, they never start from nothing. */
export const defaultAvailability: AvailabilitySettings = {
  weekPlan: {
    monday: WORKDAY_BLOCKS,
    tuesday: WORKDAY_BLOCKS,
    wednesday: WORKDAY_BLOCKS,
    thursday: WORKDAY_BLOCKS,
    friday: WORKDAY_BLOCKS,
    saturday: WEEKEND_BLOCKS,
    sunday: WEEKEND_BLOCKS,
  },
  overrides: [],
}
