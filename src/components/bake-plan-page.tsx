import { Text, Title } from '@mantine/core'
import { useState } from 'react'
import type { Experience } from '../auth/experience'
import { formatDayTime } from '../plan-flow/local-time'
import type { Availability, Plan } from '../solver/types'
import { PlanFlowLayout } from './plan-flow-layout'
import { ReminderCard } from './reminder-card'
import { SurveyForm } from './survey-form'
import { TechniqueDemos } from './technique-demo'
import { TimelineCard } from './timeline-card'

type Props = {
  /** Nothing when the recipe of the plan is no longer in the list. */
  recipeName?: string
  plan: Plan
  availability: Availability
  /** The baker's sign-up answer, for the survey. */
  experience: Experience
}

/** An accepted plan: the next hands-on step, the timeline, and how each technique is done. */
export function BakePlanPage({ recipeName, plan, availability, experience }: Props) {
  const [firstReminderDone, setFirstReminderDone] = useState(false)

  return (
    <PlanFlowLayout position={5} title="Your bake">
      <Text>
        {recipeName}. Bread ready {formatDayTime(plan.finish)}.
      </Text>
      <ReminderCard steps={plan.steps} onFirstDone={() => setFirstReminderDone(true)} />
      {firstReminderDone && <SurveyForm experience={experience} />}
      <Title order={2} size="h4">
        Timeline
      </Title>
      <TimelineCard plan={plan} availability={availability} />
      <TechniqueDemos steps={plan.steps} />
    </PlanFlowLayout>
  )
}
