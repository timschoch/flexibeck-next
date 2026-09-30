import { Stack, Text, Title } from '@mantine/core'
import { useId, useState } from 'react'
import { findTechniqueVideo } from '../solver/data/technique-videos'
import type { PlannedStep, Technique, TechniqueVideo } from '../solver/types'
import classes from './plan-flow.module.css'

const TECHNIQUE_NAMES: Record<Technique, string> = {
  'levain-build': 'Build the levain',
  autolyse: 'Autolyse',
  mix: 'Mix',
  fold: 'Stretch and fold',
  shape: 'Shape',
}

/** The privacy-enhanced player: no cookie and no request until the iframe exists. */
function embedUrl(video: TechniqueVideo): string {
  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?start=${video.startSeconds}&autoplay=1`
}

/** The creator video of one technique: a plain box with a play button, then the player once the baker presses it. */
export function TechniqueDemo({ video }: { video: TechniqueVideo }) {
  const captionId = useId()
  const [playing, setPlaying] = useState(false)
  const name = TECHNIQUE_NAMES[video.technique]

  return (
    <figure className={classes.video} aria-labelledby={captionId}>
      {playing ? (
        <iframe
          className={classes.player}
          src={embedUrl(video)}
          title={`${name}, ${video.creator}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className={classes.poster} aria-label={`Play video: ${name}`} onClick={() => setPlaying(true)}>
          <span className={classes.play} aria-hidden>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <path d="M6 3.5v15l12-7.5z" />
            </svg>
          </span>
        </button>
      )}
      <Text component="figcaption" size="sm" c="dimmed" mt={4} id={captionId}>
        {name}, {video.creator}
      </Text>
    </figure>
  )
}

/** "How it is done": one demo for each technique the steps name. The first step of a technique gives the video. */
export function TechniqueDemos({ steps }: { steps: PlannedStep[] }) {
  const headingId = useId()
  const videos = new Map<Technique, TechniqueVideo>()
  for (const step of steps) {
    const video = findTechniqueVideo(step.stepId)
    if (video && !videos.has(video.technique)) videos.set(video.technique, video)
  }
  if (videos.size === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <Stack gap="sm">
        <Title order={2} size="h4" id={headingId}>
          How it is done
        </Title>
        {[...videos.values()].map((video) => (
          <TechniqueDemo key={video.technique} video={video} />
        ))}
      </Stack>
    </section>
  )
}
