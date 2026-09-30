import { Stack, Text } from '@mantine/core'
import { formatDayTime, formatLength } from '../plan-flow/local-time'
import { listTimeRanges } from '../solver/availability'
import type { Availability, Plan, PlannedStep } from '../solver/types'
import classes from './plan-flow.module.css'

const PERCENT = 100

/** The colour of a step: hands-on wins, then where the dough is. */
export type Tone = 'hands-on' | 'room' | 'fridge' | 'oven'

export const TONE_NAMES: Record<Tone, string> = {
  'hands-on': 'Hands-on',
  room: 'Room',
  fridge: 'Fridge',
  oven: 'Oven',
}

function toneOf(step: PlannedStep): Tone {
  if (step.presence === 'hands-on') return 'hands-on'
  if (step.environment === 'fridge' || step.environment === 'oven') return step.environment
  return 'room'
}

type Props = {
  plan: Plan
  availability: Availability
  /** List the hands-on steps only. The bar always shows every step. */
  handsOnOnly?: boolean
}

/** A plan on the clock: a bar with the baker's availability behind the steps, then the steps as a list. */
export function TimelineCard({ plan, availability, handsOnOnly }: Props) {
  const span = plan.finish - plan.start
  const place = (start: number, end: number) => ({
    left: `${((Math.max(start, plan.start) - plan.start) / span) * PERCENT}%`,
    width: `${((Math.min(end, plan.finish) - Math.max(start, plan.start)) / span) * PERCENT}%`,
  })
  const listed = handsOnOnly ? plan.steps.filter((step) => step.presence === 'hands-on') : plan.steps

  return (
    <Stack gap="xs">
      <div>
        <div
          className={classes.track}
          role="img"
          aria-label={`Timeline from ${formatDayTime(plan.start)} to ${formatDayTime(plan.finish)}`}
        >
          {listTimeRanges(availability, { start: plan.start, end: plan.finish }).map((range) => (
            <div key={range.start} className={classes.available} style={place(range.start, range.end)} />
          ))}
          {plan.steps.map((step, index) => (
            <div key={index} className={classes.segment} data-tone={toneOf(step)} style={place(step.start, step.end)} />
          ))}
        </div>
        <div className={classes.ticks} aria-hidden>
          <span>{formatDayTime(plan.start)}</span>
          <span>{formatDayTime(plan.finish)}</span>
        </div>
      </div>
      <ol className={classes.steps} aria-label={handsOnOnly ? 'Hands-on steps' : 'Steps'}>
        {listed.map((step, index) => (
          <li key={index} className={classes.step}>
            <span className={classes.swatch} data-tone={toneOf(step)} aria-hidden />
            <Text span inherit fw={700}>
              {formatDayTime(step.start)}
            </Text>
            <span>
              {step.name}
              <Text span inherit c="dimmed">
                {' · '}
                {handsOnOnly ? '' : `${TONE_NAMES[toneOf(step)]} · `}
                {formatLength(step.end - step.start)}
              </Text>
            </span>
          </li>
        ))}
      </ol>
    </Stack>
  )
}
