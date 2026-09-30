import { Text, Title } from '@mantine/core'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { PlanFlowLayout } from '../components/plan-flow-layout'
import { ReminderCard } from '../components/reminder-card'
import { SurveyForm } from '../components/survey-form'
import { TimelineCard } from '../components/timeline-card'
import { defaultAvailability } from '../plan-flow/default-availability'
import { formatDayTime } from '../plan-flow/local-time'
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
  component: BakePlanPage,
})

function BakePlanPage() {
  const { recipeId, plan, availability } = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const recipe = recipes.find((candidate) => candidate.id === recipeId)
  const [firstReminderDone, setFirstReminderDone] = useState(false)

  return (
    <PlanFlowLayout position={5} title="Your bake">
      <Text>
        {recipe?.name}. Bread ready {formatDayTime(plan.finish)}.
      </Text>
      <ReminderCard steps={plan.steps} onFirstDone={() => setFirstReminderDone(true)} />
      {firstReminderDone && <SurveyForm experience={session.user.experience} />}
      <Title order={2} size="h4">
        Timeline
      </Title>
      <TimelineCard plan={plan} availability={availability} />
    </PlanFlowLayout>
  )
}
