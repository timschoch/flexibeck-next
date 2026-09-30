import { Alert, Button, CloseButton, Group, NumberInput, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { TimePicker } from '@mantine/dates'
import { useId, useState } from 'react'
import { track } from '../analytics/analytics'
import { type AvailabilitySettings, availabilitySchema } from '../db/json-schemas'
import { DEFAULT_KITCHEN_TEMPERATURE, WEEKDAYS } from '../plan-flow/default-availability'
import type { AvailabilityBlock, DateOverride, Weekday } from '../solver/types'
import classes from './plan-flow.module.css'
import { PlanFlowLayout } from './plan-flow-layout'

const WEEKDAY_NAMES: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}
const NEW_BLOCK: AvailabilityBlock = { start: '12:00', end: '13:00' }
const FRIDGE_TEMPERATURE_EXAMPLE = 5
const MINUTES_STEP = 15

type ClockFieldProps = {
  /** Names the block in both controls, for example `Monday block 1 start`. */
  name: string
  value: string
  onChange: (value: string) => void
}

/** A time of day, always in 24 h like the timeline (Glue I2). Hour and minute are one spin button each. */
function ClockField({ name, value, onChange }: ClockFieldProps) {
  return (
    <TimePicker
      className={classes.clock}
      format="24h"
      minutesStep={MINUTES_STEP}
      withDropdown
      hoursInputLabel={`${name} hour`}
      minutesInputLabel={`${name} minute`}
      value={value}
      onChange={onChange}
    />
  )
}

type BlockFieldsProps = {
  /** Names the day in every control, for example `Monday`. */
  day: string
  blocks: AvailabilityBlock[]
  onChange: (blocks: AvailabilityBlock[]) => void
}

function BlockFields({ day, blocks, onChange }: BlockFieldsProps) {
  function setBlock(index: number, change: Partial<AvailabilityBlock>) {
    onChange(blocks.map((block, position) => (position === index ? { ...block, ...change } : block)))
  }

  return (
    <Stack gap="xs">
      {blocks.length === 0 && (
        <Text size="sm" c="dimmed">
          Not available
        </Text>
      )}
      {blocks.map((block, index) => (
        <Group key={index} gap="xs" wrap="nowrap">
          <ClockField name={`${day} block ${index + 1} start`} value={block.start} onChange={(start) => setBlock(index, { start })} />
          <Text size="sm" aria-hidden>
            to
          </Text>
          <ClockField name={`${day} block ${index + 1} end`} value={block.end} onChange={(end) => setBlock(index, { end })} />
          <CloseButton
            aria-label={`Remove ${day} block ${index + 1}`}
            onClick={() => onChange(blocks.filter((_, position) => position !== index))}
          />
        </Group>
      ))}
      <div>
        <Button variant="default" size="compact-sm" aria-label={`Add a block on ${day}`} onClick={() => onChange([...blocks, NEW_BLOCK])}>
          Add a block
        </Button>
      </div>
    </Stack>
  )
}

type Props = {
  initial: AvailabilitySettings
  onSave: (settings: AvailabilitySettings) => Promise<void>
}

export function AvailabilityForm({ initial, onSave }: Props) {
  const weekPlanId = useId()
  const overridesId = useId()
  const [weekPlan, setWeekPlan] = useState(initial.weekPlan)
  const [overrides, setOverrides] = useState(initial.overrides)
  const [kitchenTemperature, setKitchenTemperature] = useState<number | string>(initial.kitchenTemperature ?? '')
  const [fridgeTemperature, setFridgeTemperature] = useState<number | string>(initial.fridgeTemperature ?? '')
  const [errorMessage, setErrorMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  function setOverride(index: number, change: Partial<DateOverride>) {
    setOverrides(overrides.map((override, position) => (position === index ? { ...override, ...change } : override)))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const settings = availabilitySchema.safeParse({
      weekPlan,
      overrides,
      ...(typeof kitchenTemperature === 'number' && { kitchenTemperature }),
      ...(typeof fridgeTemperature === 'number' && { fridgeTemperature }),
    })
    if (!settings.success) {
      setErrorMessage(settings.error.issues[0]?.message)
      return
    }
    setErrorMessage(undefined)
    setPending(true)
    try {
      await onSave(settings.data)
      track('availability_set')
    } catch {
      setErrorMessage('Could not save your availability. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <PlanFlowLayout position={2} title="Your availability">
      <Text>The hours when you can do hands-on steps. Outside them, the dough works alone.</Text>
      <form onSubmit={handleSubmit}>
        <Stack gap="xl">
          <Stack gap="sm" component="section" aria-labelledby={weekPlanId}>
            <Title order={2} size="h4" id={weekPlanId}>
              Week plan
            </Title>
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className={classes.day} role="group" aria-label={WEEKDAY_NAMES[weekday]}>
                <Text fw={700} mb="xs">
                  {WEEKDAY_NAMES[weekday]}
                </Text>
                <BlockFields
                  day={WEEKDAY_NAMES[weekday]}
                  blocks={weekPlan[weekday]}
                  onChange={(blocks) => setWeekPlan({ ...weekPlan, [weekday]: blocks })}
                />
              </div>
            ))}
          </Stack>

          <Stack gap="sm" component="section" aria-labelledby={overridesId}>
            <div>
              <Title order={2} size="h4" id={overridesId}>
                One-off dates
              </Title>
              <Text size="sm" c="dimmed">
                A date here replaces the week plan on that day. No blocks: you are away.
              </Text>
            </div>
            {overrides.map((override, index) => (
              <div key={index} className={classes.day}>
                <Group gap="xs" wrap="nowrap" mb="xs" align="flex-end">
                  <TextInput
                    className={classes.clock}
                    type="date"
                    label={`Date ${index + 1}`}
                    value={override.date}
                    onChange={(event) => setOverride(index, { date: event.currentTarget.value })}
                  />
                  <CloseButton
                    aria-label={`Remove date ${index + 1}`}
                    onClick={() => setOverrides(overrides.filter((_, position) => position !== index))}
                  />
                </Group>
                <BlockFields day={`Date ${index + 1}`} blocks={override.blocks} onChange={(blocks) => setOverride(index, { blocks })} />
              </div>
            ))}
            <div>
              <Button variant="default" onClick={() => setOverrides([...overrides, { date: '', blocks: [] }])}>
                Add a date
              </Button>
            </div>
          </Stack>

          <SimpleGrid cols={2}>
            <NumberInput
              label="Kitchen temperature (°C)"
              description="Optional. Sets the speed of room steps"
              placeholder={String(DEFAULT_KITCHEN_TEMPERATURE)}
              value={kitchenTemperature}
              onChange={setKitchenTemperature}
            />
            <NumberInput
              label="Fridge temperature (°C)"
              description="Optional"
              placeholder={String(FRIDGE_TEMPERATURE_EXAMPLE)}
              value={fridgeTemperature}
              onChange={setFridgeTemperature}
            />
          </SimpleGrid>

          {errorMessage && (
            <Alert color="red" role="alert">
              {errorMessage}
            </Alert>
          )}
          <Button type="submit" size="md" loading={pending}>
            Save availability
          </Button>
        </Stack>
      </form>
    </PlanFlowLayout>
  )
}
