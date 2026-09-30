import { z } from 'zod'

// Local stand-in until the solver's types land; then these derive from them.

const MIN_KITCHEN_TEMPERATURE = 5
const MAX_KITCHEN_TEMPERATURE = 45
const MIN_FRIDGE_TEMPERATURE = -5
const MAX_FRIDGE_TEMPERATURE = 15

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')

const window = z
  .object({ start: time, end: time })
  .refine(({ start, end }) => start < end, { message: 'A window must end after it starts' })

const weeklyWindow = z.intersection(window, z.object({ weekday: z.number().int().min(0).max(6) }))

const override = z.object({
  date: z.iso.date(),
  windows: z.array(window),
})

export const availabilitySchema = z.object({
  weeklyWindows: z.array(weeklyWindow),
  overrides: z.array(override),
  kitchenTemperature: z.number().min(MIN_KITCHEN_TEMPERATURE).max(MAX_KITCHEN_TEMPERATURE),
  fridgeTemperature: z.number().min(MIN_FRIDGE_TEMPERATURE).max(MAX_FRIDGE_TEMPERATURE),
})

export const bakePlanSchema = z.record(z.string(), z.unknown())

export type Availability = z.infer<typeof availabilitySchema>
export type BakePlan = z.infer<typeof bakePlanSchema>
