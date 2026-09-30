import { defaultAvailability } from '../plan-flow/default-availability'
import { hacks } from '../solver/data/hacks'
import { recipes } from '../solver/data/recipes'
import { plan } from '../solver/plan'
import { parseLocalTime } from '../solver/time'
import type { Plan, Recipe } from '../solver/types'

export const basicRecipe = recipes.find((recipe) => recipe.id === 'sauerteig-basic-brot') as Recipe

/** A Monday at 06:00, inside the default availability: the solver finds three plans. */
export const MONDAY_MORNING = parseLocalTime('2026-10-05T06:00')

export const plans: Plan[] = plan({
  recipe: basicRecipe,
  hacks,
  availability: defaultAvailability,
  kitchen: { temperature: 24 },
  now: MONDAY_MORNING,
  mode: { kind: 'start-now' },
})
