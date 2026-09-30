import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { BakePlanPage } from '../components/bake-plan-page'
import { defaultAvailability } from '../plan-flow/default-availability'
import { fetchAvailability, fetchBakePlan } from '../plan-flow/store'
import { recipes } from '../solver/data/recipes'

export const Route = createFileRoute('/bake-plans/$bakePlanId')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/sign-in' })
    return { session: context.session }
  },
  loader: async ({ params }) => {
    const [bakePlan, availability] = await Promise.all([fetchBakePlan({ data: params.bakePlanId }), fetchAvailability()])
    if (!bakePlan) throw notFound()
    return { ...bakePlan, availability: availability ?? defaultAvailability }
  },
  component: BakePlan,
})

function BakePlan() {
  const { recipeId, plan, availability } = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const recipe = recipes.find((candidate) => candidate.id === recipeId)

  return <BakePlanPage recipeName={recipe?.name} plan={plan} availability={availability} experience={session.user.experience} />
}
