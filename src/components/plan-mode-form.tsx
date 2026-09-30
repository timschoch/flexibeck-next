import { Button, Radio, Stack, TextInput } from '@mantine/core'
import { useState } from 'react'
import { track } from '../analytics/analytics'
import { localNow } from '../plan-flow/local-time'
import { formatLocalTime } from '../solver/time'
import { PlanFlowLayout } from './plan-flow-layout'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

/** `finish` is a local time, `YYYY-MM-DDTHH:MM`. */
export type PlanModeChoice = { mode: 'start-now' } | { mode: 'ready-by'; finish: string }

/** This time tomorrow, on the full hour: a first guess the baker then changes. */
function suggestFinish(): string {
  return formatLocalTime(Math.ceil((localNow() + MINUTES_PER_DAY) / MINUTES_PER_HOUR) * MINUTES_PER_HOUR)
}

export function PlanModeForm({ onChoose }: { onChoose: (choice: PlanModeChoice) => void }) {
  const [mode, setMode] = useState<PlanModeChoice['mode']>('start-now')
  const [finish, setFinish] = useState('')

  function handleModeChange(next: string) {
    setMode(next === 'ready-by' ? 'ready-by' : 'start-now')
    if (next === 'ready-by' && !finish) setFinish(suggestFinish())
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    track('plan_mode_chosen', { mode })
    onChoose(mode === 'ready-by' ? { mode, finish } : { mode })
  }

  return (
    <PlanFlowLayout position={3} title="When do you bake?">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Radio.Group value={mode} onChange={handleModeChange} aria-label="Plan mode">
            <Stack gap="sm">
              <Radio value="start-now" label="Start now" description="The first step starts right away" />
              <Radio value="ready-by" label="Ready by" description="The bread is done at the time you set" />
            </Stack>
          </Radio.Group>
          {mode === 'ready-by' && (
            <TextInput
              type="datetime-local"
              label="Bread ready by"
              value={finish}
              onChange={(event) => setFinish(event.currentTarget.value)}
              required
            />
          )}
          <Button type="submit" size="md">
            Show plans
          </Button>
        </Stack>
      </form>
    </PlanFlowLayout>
  )
}
