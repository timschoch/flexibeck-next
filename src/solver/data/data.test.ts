import { describe, expect, it } from 'vitest'
import { plan } from '../plan'
import { parseLocalTime } from '../time'
import type { Availability, Step, Weekday } from '../types'
import { hacks } from './hacks'
import { recipes } from './recipes'

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const allDay: Availability = {
  weekPlan: Object.fromEntries(weekdays.map((weekday) => [weekday, [{ start: '00:00', end: '00:00' }]])) as Availability['weekPlan'],
  overrides: [],
}

function listSteps(steps: Step[]): Step[] {
  return steps.flatMap((step) => [
    step,
    ...listSteps(step.inputs ?? []),
    ...('children' in step ? listSteps(step.children) : []),
  ])
}

describe('hacks', () => {
  it('have unique ids', () => {
    const ids = hacks.map((hack) => hack.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cite their line in hacks.md', () => {
    for (const hack of hacks) expect(hack.source, hack.id).toMatch(/hacks\.md:\d+/)
  })

  it('pair only with hacks that exist', () => {
    const ids = new Set(hacks.map((hack) => hack.id))
    for (const hack of hacks) for (const other of hack.combinesWith) expect(ids.has(other), `${hack.id} → ${other}`).toBe(true)
  })
})

describe('recipes', () => {
  it('have unique step ids', () => {
    for (const recipe of recipes) {
      const ids = listSteps(recipe.steps).map((step) => step.id)
      expect(new Set(ids).size, recipe.id).toBe(ids.length)
    }
  })

  it('give every check a cue', () => {
    for (const recipe of recipes) {
      for (const step of listSteps(recipe.steps)) {
        if (step.kind === 'check') expect('cue' in step && step.cue, `${recipe.id} ${step.id}`).toBeTruthy()
      }
    }
  })

  it('each yield a plan as written', () => {
    for (const recipe of recipes) {
      const [best] = plan({
        recipe,
        hacks,
        availability: allDay,
        kitchen: { temperature: 24 },
        now: parseLocalTime('2026-10-02T08:00'),
        mode: { kind: 'start-now' },
      })
      expect(best?.hackIds, recipe.id).toEqual([])
    }
  })
})
