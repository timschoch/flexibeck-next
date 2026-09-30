import type { AvailabilitySettings } from '../db/json-schemas'
import type { AvailabilityBlock, Weekday } from '../solver/types'

export const WEEKDAYS: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** Used for the plan while the baker has not set a kitchen temperature. The base recipes assume it. */
export const DEFAULT_KITCHEN_TEMPERATURE = 24

// The vision's example: before and after a working day.
const EXAMPLE_BLOCKS: AvailabilityBlock[] = [
  { start: '06:00', end: '10:00' },
  { start: '16:00', end: '22:00' },
]

/** What a baker sees before they saved an availability. */
export const defaultAvailability: AvailabilitySettings = {
  weekPlan: Object.fromEntries(WEEKDAYS.map((weekday) => [weekday, EXAMPLE_BLOCKS])) as AvailabilitySettings['weekPlan'],
  overrides: [],
}
