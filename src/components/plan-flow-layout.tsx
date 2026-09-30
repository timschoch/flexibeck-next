import { Container, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import classes from './plan-flow.module.css'

/** Recipe, availability, plan mode, plans, bake. */
const SCREEN_COUNT = 5

type Props = {
  /** 1 for the first screen of the flow. */
  position: number
  title: string
  children: ReactNode
}

export function PlanFlowLayout({ position, title, children }: Props) {
  return (
    <Container component="main" size="xs" pb="xl" className={classes.palette}>
      <Text size="sm" fw={700} c="dimmed">
        Step {position} of {SCREEN_COUNT}
      </Text>
      <div className={classes.progress} aria-hidden>
        {Array.from({ length: SCREEN_COUNT }, (_, index) => (
          <span key={index} className={classes.progressPart} data-reached={index < position || undefined} />
        ))}
      </div>
      <Stack>
        <Title order={1}>{title}</Title>
        {children}
      </Stack>
    </Container>
  )
}
