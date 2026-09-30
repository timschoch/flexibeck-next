import { describe, expect, it } from 'vitest'
import { plan } from '../plan'
import { parseLocalTime } from '../time'
import type { Availability, Step, Weekday } from '../types'
import { hacks } from './hacks'
import { recipes } from './recipes'
import { findStepVideo, stepVideos } from './step-videos'

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

describe('step videos', () => {
  const stepsById = new Map(recipes.flatMap((recipe) => listSteps(recipe.steps)).map((step) => [step.id, step]))

  it('each belong to one hands-on step of a recipe', () => {
    const ids = stepVideos.map((video) => video.stepId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const video of stepVideos) {
      const step = stepsById.get(video.stepId)
      expect(step, video.stepId).toBeDefined()
      expect('presence' in step! && step.presence, video.stepId).toBe('hands-on')
    }
  })

  it('link the creator over https, with the recipe page as the source', () => {
    for (const video of stepVideos) {
      expect(video.url, video.stepId).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+&t=\d+s$/)
      expect(video.source, video.stepId).toMatch(/^https:\/\/www\.marcelpaa\.com\//)
      expect(video.title, video.stepId).not.toBe('')
    }
  })

  it('are found by step id', () => {
    expect(findStepVideo('basic-fold-1')?.url).toContain('K4TdJsa1voI')
    expect(findStepVideo('no-such-step')).toBeUndefined()
  })
})
