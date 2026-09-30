import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '../auth/auth'
import { db } from '../db/client'
import { availabilitySchema, bakePlanSchema } from '../db/json-schemas'
import { availabilities, bakePlans } from '../db/schema'
import { recipes } from '../solver/data/recipes'

const bakePlanInput = z.object({
  recipeId: z.string().refine((id) => recipes.some((recipe) => recipe.id === id), { message: 'Unknown recipe' }),
  mode: z.enum(['start-now', 'ready-by']),
  plan: bakePlanSchema,
})

/** Every read and write below belongs to the signed-in baker. */
async function getBakerId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('Sign in first')
  return session.user.id
}

/** The baker's saved availability, or nothing before the first save. */
export const fetchAvailability = createServerFn({ method: 'GET' }).handler(async () => {
  const bakerId = await getBakerId()
  const [row] = await db.select().from(availabilities).where(eq(availabilities.bakerId, bakerId))
  return availabilitySchema.safeParse(row?.settings).data ?? null
})

export const saveAvailability = createServerFn({ method: 'POST' })
  .validator(availabilitySchema)
  .handler(async ({ data: settings }) => {
    const bakerId = await getBakerId()
    await db
      .insert(availabilities)
      .values({ bakerId, settings })
      .onConflictDoUpdate({ target: availabilities.bakerId, set: { settings } })
  })

/** Saves the plan the baker accepted and returns its id. */
export const createBakePlan = createServerFn({ method: 'POST' })
  .validator(bakePlanInput)
  .handler(async ({ data }) => {
    const bakerId = await getBakerId()
    const id = crypto.randomUUID()
    await db.insert(bakePlans).values({ id, bakerId, ...data })
    return id
  })

/** One accepted plan of the signed-in baker, or nothing when the id is not theirs. */
export const fetchBakePlan = createServerFn({ method: 'GET' })
  .validator(z.string())
  .handler(async ({ data: id }) => {
    const bakerId = await getBakerId()
    const [row] = await db
      .select()
      .from(bakePlans)
      .where(and(eq(bakePlans.id, id), eq(bakePlans.bakerId, bakerId)))
    const plan = bakePlanSchema.safeParse(row?.plan).data
    return row && plan ? { recipeId: row.recipeId, plan } : null
  })
