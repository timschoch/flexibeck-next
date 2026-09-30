import { Button, Stack, Text, Title } from '@mantine/core'
import { useId, useState } from 'react'
import { track } from '../analytics/analytics'
import { formatDayTimeRange, formatLength } from '../plan-flow/local-time'
import { findTechniqueVideo } from '../solver/data/technique-videos'
import type { PlannedStep } from '../solver/types'
import classes from './plan-flow.module.css'
import { TechniqueDemo } from './technique-demo'

/** The next hands-on step of an accepted plan. The baker marks it done, then the one after it shows. */
export function ReminderCard({ steps, onFirstDone }: { steps: PlannedStep[]; onFirstDone?: () => void }) {
  const headingId = useId()
  const [doneCount, setDoneCount] = useState(0)
  const handsOnSteps = steps.filter((step) => step.presence === 'hands-on')
  const next = handsOnSteps[doneCount]

  function handleDone() {
    if (doneCount === 0) {
      track('first_reminder_done')
      onFirstDone?.()
    }
    setDoneCount(doneCount + 1)
  }

  if (!next) {
    return (
      <section className={classes.reminder}>
        <Text fw={700}>Every hands-on step is done. Enjoy your bread.</Text>
      </section>
    )
  }

  const startsExactly = next.startWindow.end - next.startWindow.start < 1
  const video = findTechniqueVideo(next.stepId)
  return (
    <section className={classes.reminder} aria-labelledby={headingId}>
      <Stack gap="xs">
        <Text size="sm" c="dimmed" fw={700}>
          Next hands-on step · {doneCount + 1} of {handsOnSteps.length}
        </Text>
        <Title order={2} size="h3" id={headingId}>
          {next.name}
        </Title>
        <div>
          <span className={classes.window}>
            {startsExactly
              ? formatDayTimeRange(next.start, next.end)
              : `Start ${formatDayTimeRange(next.startWindow.start, next.startWindow.end)}`}
          </span>
        </div>
        <Text size="sm">Takes {formatLength(next.end - next.start)}</Text>
        {next.cue && <Text size="sm">Cue: {next.cue}</Text>}
        {/* The key is the step: the next step begins with its player unloaded. */}
        {video && <TechniqueDemo key={next.stepId} video={video} />}
        <Button onClick={handleDone}>Done</Button>
      </Stack>
    </section>
  )
}
