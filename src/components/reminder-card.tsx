import { Button, Stack, Text, Title } from '@mantine/core'
import { useId, useState } from 'react'
import { track } from '../analytics/analytics'
import { formatDayTimeRange, formatLength } from '../plan-flow/local-time'
import { findStepVideo } from '../solver/data/step-videos'
import type { PlannedStep, StepVideo } from '../solver/types'
import classes from './plan-flow.module.css'

/** The privacy-enhanced player: no cookie and no request until the iframe exists. */
function embedUrl(video: StepVideo): string {
  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?start=${video.startSeconds}&autoplay=1`
}

/** The next hands-on step of an accepted plan. The baker marks it done, then the one after it shows. */
export function ReminderCard({ steps, onFirstDone }: { steps: PlannedStep[]; onFirstDone?: () => void }) {
  const headingId = useId()
  const captionId = useId()
  const [doneCount, setDoneCount] = useState(0)
  /** The step whose player the baker started. The next step begins unloaded again. */
  const [playingStepId, setPlayingStepId] = useState<string>()
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
  const video = findStepVideo(next.stepId)
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
        {video && (
          <figure className={classes.video} aria-labelledby={captionId}>
            {playingStepId === next.stepId ? (
              <iframe
                className={classes.player}
                src={embedUrl(video)}
                title={`${next.name}, ${video.creator}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className={classes.poster}
                aria-label={`Play video: ${next.name}`}
                onClick={() => setPlayingStepId(next.stepId)}
              >
                <span className={classes.play} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
                    <path d="M6 3.5v15l12-7.5z" />
                  </svg>
                </span>
              </button>
            )}
            <Text component="figcaption" size="sm" c="dimmed" mt={4} id={captionId}>
              {next.name}, {video.creator}
            </Text>
          </figure>
        )}
        <Button onClick={handleDone}>Done</Button>
      </Stack>
    </section>
  )
}
