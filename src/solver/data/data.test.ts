import { describe, expect, it } from 'vitest'
import { plan } from '../plan'
import { parseLocalTime } from '../time'
import type { Availability, Step, Weekday } from '../types'
import { hacks } from './hacks'
import { recipes } from './recipes'
import { findTechniqueVideo } from './technique-videos'

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

describe('technique videos', () => {
  const recipeSteps = recipes.flatMap((recipe) => listSteps(recipe.steps))
  const hackSteps = hacks.flatMap((hack) =>
    hack.effects.flatMap((effect) => (effect.kind === 'replace-steps' ? listSteps(effect.steps) : [])),
  )
  const isHandsOn = (step: Step) => 'presence' in step && step.presence === 'hands-on'

  it('find a step by its id: no two steps of the recipes and hacks share one', () => {
    const ids = [...recipeSteps, ...hackSteps].map((step) => step.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('show every hands-on step of every recipe and hack', () => {
    expect(recipeSteps.filter(isHandsOn).length).toBeGreaterThan(0)
    expect(hackSteps.filter(isHandsOn).length).toBeGreaterThan(0)
    for (const step of [...recipeSteps, ...hackSteps].filter(isHandsOn)) {
      expect(findTechniqueVideo(step.id), step.id).toBeDefined()
    }
  })

  it('name a YouTube video, its chapter start, the creator and the creator page as the source', () => {
    for (const step of [...recipeSteps, ...hackSteps].filter(isHandsOn)) {
      const video = findTechniqueVideo(step.id)
      expect(video?.youtubeId, step.id).toMatch(/^[\w-]{11}$/)
      expect(Number.isInteger(video?.startSeconds) && video!.startSeconds >= 0, step.id).toBe(true)
      expect(video?.creator, step.id).toBe('Marcel Paa')
      expect(video?.source, step.id).toMatch(/^https:\/\/www\.marcelpaa\.com\//)
      expect(video?.title, step.id).not.toBe('')
    }
  })

  it('open the video of the recipe at the chapter of the technique', () => {
    expect(findTechniqueVideo('nine-to-five-mix')).toMatchObject({ technique: 'mix', youtubeId: 'Gp5ELw3jD04', startSeconds: 31 })
    expect(findTechniqueVideo('basic-fold-1')).toMatchObject({ technique: 'fold', youtubeId: 'K4TdJsa1voI', startSeconds: 179 })
    expect(findTechniqueVideo('basic-fold-2')).toEqual(findTechniqueVideo('basic-fold-1'))
    expect(findTechniqueVideo('one-by-one-shape')).toMatchObject({ technique: 'shape', youtubeId: 'J9A6yoKrygs', startSeconds: 731 })
  })

  it('take the technique of a mix inside an autolyse or a levain build from that parent step', () => {
    expect(findTechniqueVideo('basic-autolyse-mix')).toMatchObject({ technique: 'autolyse', youtubeId: 'K4TdJsa1voI', startSeconds: 29 })
    expect(findTechniqueVideo('one-by-one-preferment-mix')).toMatchObject({
      technique: 'levain-build',
      youtubeId: 'J9A6yoKrygs',
      startSeconds: 71,
    })
  })

  it('open the video of a hack for the steps of that hack', () => {
    expect(findTechniqueVideo('four-hour-mix')).toMatchObject({ technique: 'mix', youtubeId: 'ZdIlvbulBA8', startSeconds: 10 })
    expect(findTechniqueVideo('four-hour-shape')).toMatchObject({ technique: 'shape', youtubeId: 'ZdIlvbulBA8', startSeconds: 130 })
  })

  it('open the chapter of a recipe video when the video of the hack has no chapter for the technique', () => {
    expect(findTechniqueVideo('four-hour-fold-1')).toMatchObject({ technique: 'fold', youtubeId: 'J9A6yoKrygs', startSeconds: 635 })
  })

  it('have no video for a step that is not hands-on, and none for an unknown step', () => {
    expect(findTechniqueVideo('basic-bulk-rest-1')).toBeUndefined()
    expect(findTechniqueVideo('four-hour-bake')).toBeUndefined()
    expect(findTechniqueVideo('no-such-step')).toBeUndefined()
  })
})
