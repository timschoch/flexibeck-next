import { WEEKDAYS } from '../plan-flow/default-availability'
import { hacks } from '../solver/data/hacks'
import { recipes } from '../solver/data/recipes'
import { plan } from '../solver/plan'
import { parseLocalTime } from '../solver/time'
import type { Availability, Plan, Recipe } from '../solver/types'

export const basicRecipe = recipes.find((recipe) => recipe.id === 'sauerteig-basic-brot') as Recipe

/** The vision's example, before and after a working day, every day. */
export const morningAndEvening: Availability = {
  weekPlan: Object.fromEntries(
    WEEKDAYS.map((weekday) => [
      weekday,
      [
        { start: '06:00', end: '10:00' },
        { start: '16:00', end: '22:00' },
      ],
    ]),
  ) as Availability['weekPlan'],
  overrides: [],
}

/** A Monday at 06:00, inside `morningAndEvening`: the solver finds three plans. */
export const MONDAY_MORNING = parseLocalTime('2026-10-05T06:00')

export const plans: Plan[] = plan({
  recipe: basicRecipe,
  hacks,
  availability: morningAndEvening,
  kitchen: { temperature: 24 },
  now: MONDAY_MORNING,
  mode: { kind: 'start-now' },
})
