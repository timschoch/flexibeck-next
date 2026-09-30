import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { AvailabilityForm } from '../components/availability-form'
import { PlanModeForm } from '../components/plan-mode-form'
import { PlansPage } from '../components/plans-page'
import { RecipePage } from '../components/recipe-page'
import type { AvailabilitySettings } from '../db/json-schemas'
import { DEFAULT_KITCHEN_TEMPERATURE, defaultAvailability } from '../plan-flow/default-availability'
import { localNow } from '../plan-flow/local-time'
import { createBakePlan, fetchAvailability, saveAvailability } from '../plan-flow/store'
import { hacks } from '../solver/data/hacks'
import { recipes } from '../solver/data/recipes'
import { findClosestPlan, plan } from '../solver/plan'
import { formatLocalTime, parseLocalTime } from '../solver/time'
import type { Plan, PlanInput, Recipe } from '../solver/types'

// The flow's state lives in the URL: a reload keeps the screen and the browser's back button works.
const planSearchSchema = z.object({
  screen: z.enum(['recipe', 'availability', 'mode', 'plans']).optional(),
  recipeId: z.string().optional(),
  mode: z.enum(['start-now', 'ready-by']).optional(),
  /** For `ready-by`: a local time, `YYYY-MM-DDTHH:MM`. */
  finish: z.iso.datetime({ local: true, precision: -1 }).optional(),
})

type PlanSearch = z.infer<typeof planSearchSchema>

export const Route = createFileRoute('/plan')({
  validateSearch: planSearchSchema,
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/sign-in' })
  },
  loader: () => fetchAvailability(),
  component: PlanPage,
})

function PlanPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const settings = Route.useLoaderData() ?? defaultAvailability
  const recipe = recipes.find((candidate) => candidate.id === search.recipeId)

  if (!recipe || !search.screen || search.screen === 'recipe') {
    return <RecipePage onChoose={(recipeId) => navigate({ search: { screen: 'availability', recipeId } })} />
  }

  if (search.screen === 'availability') {
    return (
      <AvailabilityForm
        initial={settings}
        onSave={async (next) => {
          await saveAvailability({ data: next })
          await router.invalidate()
          await navigate({ search: { screen: 'mode', recipeId: recipe.id } })
        }}
      />
    )
  }

  const readyByWithoutFinish = search.mode === 'ready-by' && !search.finish
  if (search.screen === 'mode' || !search.mode || readyByWithoutFinish) {
    return <PlanModeForm onChoose={(choice) => navigate({ search: { screen: 'plans', recipeId: recipe.id, ...choice } })} />
  }

  return <RankedPlans recipe={recipe} settings={settings} mode={search.mode} finish={search.finish} />
}

type RankedPlansProps = {
  recipe: Recipe
  settings: AvailabilitySettings
  mode: NonNullable<PlanSearch['mode']>
  finish: PlanSearch['finish']
}

function RankedPlans({ recipe, settings, mode, finish }: RankedPlansProps) {
  const navigate = Route.useNavigate()
  const router = useRouter()
  const [result, setResult] = useState<{ plans: Plan[]; closest?: Plan }>()

  // Only the browser knows the baker's clock, so the solver runs after hydration, not on the server.
  useEffect(() => {
    const input = {
      recipe,
      hacks,
      availability: settings,
      kitchen: { temperature: settings.kitchenTemperature ?? DEFAULT_KITCHEN_TEMPERATURE },
      now: localNow(),
      mode: mode === 'ready-by' && finish ? { kind: 'ready-by', finish: parseLocalTime(finish) } : { kind: 'start-now' },
    } satisfies PlanInput
    const plans = plan(input)
    setResult(plans.length > 0 ? { plans } : { plans, closest: findClosestPlan(input) })
  }, [recipe, settings, mode, finish])

  if (!result) return null

  return (
    <PlansPage
      plans={result.plans}
      closest={result.closest}
      availability={settings}
      onAccept={async (accepted) => {
        const bakePlanId = await createBakePlan({ data: { recipeId: recipe.id, mode, plan: accepted } })
        await router.navigate({ to: '/bake-plans/$bakePlanId', params: { bakePlanId } })
      }}
      onChooseFinish={(next) =>
        navigate({ search: { screen: 'plans', recipeId: recipe.id, mode: 'ready-by', finish: formatLocalTime(next) } })
      }
      onChangeAvailability={() => navigate({ search: { screen: 'availability', recipeId: recipe.id } })}
    />
  )
}
