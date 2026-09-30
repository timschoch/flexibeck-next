import { z } from 'zod'
import type { Availability, Plan } from '../solver/types'

// Runtime guards for the JSON columns. Their shapes are the solver's types (../solver/types).

const MIN_KITCHEN_TEMPERATURE = 5
const MAX_KITCHEN_TEMPERATURE = 45
const MIN_FRIDGE_TEMPERATURE = -5
const MAX_FRIDGE_TEMPERATURE = 15

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')

// An end at or before the start goes past midnight, so only the same time twice is wrong.
const block = z
  .object({ start: clock, end: clock })
  .refine(({ start, end }) => start !== end, { message: 'An availability block must end at another time than it starts' })

const blocks = z.array(block)

/** The solver's availability plus the baker's optional temperatures in °C. */
export const availabilitySchema = z.object({
  weekPlan: z.object({
    monday: blocks,
    tuesday: blocks,
    wednesday: blocks,
    thursday: blocks,
    friday: blocks,
    saturday: blocks,
    sunday: blocks,
  }),
  overrides: z.array(z.object({ date: z.iso.date(), blocks })),
  kitchenTemperature: z.number().min(MIN_KITCHEN_TEMPERATURE).max(MAX_KITCHEN_TEMPERATURE).optional(),
  fridgeTemperature: z.number().min(MIN_FRIDGE_TEMPERATURE).max(MAX_FRIDGE_TEMPERATURE).optional(),
}) satisfies z.ZodType<Availability>

const timeRange = z.object({ start: z.number(), end: z.number() })

const plannedStep = z.object({
  stepId: z.string(),
  parentId: z.string().optional(),
  kind: z.enum(['levain-build', 'autolyse', 'mix', 'bulk', 'rest', 'fold', 'check', 'shape', 'proof', 'preheat', 'bake']),
  name: z.string(),
  presence: z.enum(['hands-on', 'attended', 'unattended']),
  environment: z.enum(['room', 'fridge', 'warm-spot', 'oven']),
  cue: z.string().optional(),
  start: z.number(),
  end: z.number(),
  deviation: z.number(),
  startWindow: timeRange,
})

export const bakePlanSchema = z.object({
  hackIds: z.array(z.string()),
  start: z.number(),
  finish: z.number(),
  finishWindow: timeRange,
  lengthChange: z.number(),
  steps: z.array(plannedStep),
}) satisfies z.ZodType<Plan>

export type AvailabilitySettings = z.infer<typeof availabilitySchema>
export type BakePlan = z.infer<typeof bakePlanSchema>
