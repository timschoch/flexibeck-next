import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { type ReactNode, useEffect, useId, useState } from 'react'
import { track } from '../analytics/analytics'
import { formatDayTime, formatLength } from '../plan-flow/local-time'
import { hacks } from '../solver/data/hacks'
import type { Availability, Hack, Plan } from '../solver/types'
import classes from './plan-flow.module.css'
import { PlanFlowLayout } from './plan-flow-layout'
import { TechniqueDemos } from './technique-demo'
import { TONE_NAMES, TimelineCard, type Tone } from './timeline-card'

const TONES = Object.keys(TONE_NAMES) as Tone[]

function formatScore(score: number): string {
  return score > 0 ? `+${score}` : `−${Math.abs(score)}`
}

type CardProps = {
  plan: Plan
  title: string
  availability: Availability
  /** The button that acts on this plan. */
  children: ReactNode
}

function PlanCard({ plan, title, availability, children }: CardProps) {
  const headingId = useId()
  const used = plan.hackIds.map((id) => hacks.find((hack) => hack.id === id)).filter((hack): hack is Hack => hack !== undefined)
  const deviation = (plan.finishWindow.end - plan.finishWindow.start) / 2

  return (
    <Card component="section" aria-labelledby={headingId} withBorder radius="lg" padding="md">
      <Stack gap="sm">
        <Title order={2} size="h4" id={headingId}>
          {title}
        </Title>
        <div>
          <Text size="sm" c="dimmed">
            Bread ready
          </Text>
          <Text className={classes.big}>{formatDayTime(plan.finish)}</Text>
          <Text size="sm" c="dimmed">
            Start {formatDayTime(plan.start)} · {formatLength(plan.finish - plan.start)} in total
          </Text>
        </div>

        <div>
          <Text size="sm" fw={700}>
            Hacks
          </Text>
          {used.length === 0 && <Text size="sm">The recipe as written, no hacks</Text>}
          {used.map((hack) => (
            <Text key={hack.id} size="sm">
              {hack.name}
            </Text>
          ))}
        </div>

        <div>
          <Text size="sm" fw={700}>
            Trade-offs
          </Text>
          {used.map((hack) => (
            <div key={hack.id}>
              <Text size="sm">{hack.impact.text}</Text>
              <Group gap={6}>
                {Object.entries(hack.impact.scores).map(([dimension, score]) => (
                  <Badge key={dimension} variant="light" color={score > 0 ? 'green' : 'red'} tt="none">
                    {dimension} {formatScore(score)}
                  </Badge>
                ))}
              </Group>
            </div>
          ))}
          {Math.round(plan.lengthChange) !== 0 && (
            <Text size="sm">
              {formatLength(Math.abs(plan.lengthChange))} {plan.lengthChange > 0 ? 'longer' : 'shorter'} than the recipe as written
            </Text>
          )}
          <Text size="sm">
            {deviation >= 1
              ? `Deviation: the bread can be ready ${formatLength(deviation)} earlier or later. The dough sets the pace.`
              : 'No deviation: every step has a fixed length.'}
          </Text>
        </div>

        <TimelineCard plan={plan} availability={availability} handsOnOnly />

        {children}
      </Stack>
    </Card>
  )
}

type Props = {
  /** Ranked, best first. */
  plans: Plan[]
  /** Shown when no plan fits: the nearest plan at another time. */
  closest?: Plan
  availability: Availability
  /** Saves the plan. The page counts the plan as accepted once this resolves. */
  onAccept: (plan: Plan) => Promise<void>
  /** Plans again for bread ready by `finish`. */
  onChooseFinish: (finish: number) => void
  onChangeAvailability: () => void
}

export function PlansPage({ plans, closest, availability, onAccept, onChooseFinish, onChangeAvailability }: Props) {
  const [pendingRank, setPendingRank] = useState<number>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const count = plans.length
  const shown = count === 0 && closest ? [closest] : plans

  useEffect(() => {
    if (count > 0) track('plans_shown', { count })
  }, [count])

  async function handleAccept(plan: Plan, rank: number) {
    setErrorMessage(undefined)
    setPendingRank(rank)
    try {
      await onAccept(plan)
      track('plan_accepted', { rank, hacks: plan.hackIds })
    } catch {
      setErrorMessage('Could not save the plan. Try again.')
    } finally {
      setPendingRank(undefined)
    }
  }

  return (
    <PlanFlowLayout position={4} title="Your plans">
      {count === 0 ? (
        <Alert color="yellow" title="No plan fits your availability">
          A hands-on step of this recipe would fall outside your available hours.{' '}
          {closest
            ? `The closest plan has the bread ready ${formatDayTime(closest.finish)}.`
            : 'Add an availability block, or go back and choose another time.'}
        </Alert>
      ) : (
        <>
          <Text>Every hands-on step is inside your availability. The best fit comes first.</Text>
          <div className={classes.legend}>
            <span>
              <i className={classes.swatch} data-tone="available" />
              Your hours
            </span>
            {TONES.map((tone) => (
              <span key={tone}>
                <i className={classes.swatch} data-tone={tone} />
                {TONE_NAMES[tone]}
              </span>
            ))}
          </div>
        </>
      )}
      {errorMessage && (
        <Alert color="red" role="alert">
          {errorMessage}
        </Alert>
      )}
      {plans.map((plan, index) => (
        <PlanCard key={index} plan={plan} title={`Plan ${index + 1}`} availability={availability}>
          <Button onClick={() => handleAccept(plan, index + 1)} loading={pendingRank === index + 1}>
            Accept this plan
          </Button>
        </PlanCard>
      ))}
      {count === 0 && closest && (
        <PlanCard plan={closest} title="Closest plan" availability={availability}>
          <Button onClick={() => onChooseFinish(closest.finish)}>Plan bread ready by {formatDayTime(closest.finish)}</Button>
        </PlanCard>
      )}
      <TechniqueDemos steps={shown.flatMap((plan) => plan.steps)} />
      <Button variant="default" onClick={onChangeAvailability}>
        Change availability
      </Button>
    </PlanFlowLayout>
  )
}
