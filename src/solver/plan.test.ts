import { describe, expect, it } from 'vitest'
import { isInsideAvailability, listTimeRanges } from './availability'
import { hacks } from './data/hacks'
import { recipes } from './data/recipes'
import { findClosestPlan, plan } from './plan'
import { formatLocalTime, parseLocalTime } from './time'
import type { Availability, AvailabilityBlock, LeafStep, Plan, PlanInput, PlannedStep, Recipe, Weekday } from './types'

const HOUR = 60

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function everyDay(blocks: AvailabilityBlock[]): Availability['weekPlan'] {
  return Object.fromEntries(weekdays.map((weekday) => [weekday, blocks])) as Availability['weekPlan']
}

const morningAndEvening: Availability = {
  weekPlan: everyDay([
    { start: '06:00', end: '10:00' },
    { start: '16:00', end: '22:00' },
  ]),
  overrides: [],
}

const allDay: Availability = { weekPlan: everyDay([{ start: '00:00', end: '00:00' }]), overrides: [] }

function rest(id: string, minutes: number): LeafStep {
  return { id, kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room', duration: { min: minutes, max: minutes } }
}

function fold(id: string): LeafStep {
  return { id, kind: 'fold', name: 'Stretch and fold', presence: 'hands-on', environment: 'room', duration: { min: 5, max: 5 } }
}

// The vision's worked example: a recipe with 8 h bulk at room temperature.
const eightHourBulk: Recipe = {
  id: 'eight-hour-bulk',
  name: 'Country loaf, 8 h room bulk',
  source: 'test fixture, vision.html "How a plan comes together"',
  levainPercent: 10,
  steps: [
    { id: 'mix', kind: 'mix', name: 'Mix', presence: 'hands-on', environment: 'room', duration: { min: 20, max: 20 } },
    {
      id: 'bulk',
      kind: 'bulk',
      name: 'Bulk',
      fermentationBudget: { minutes: 8 * HOUR, temperature: 24 },
      children: [
        rest('bulk-rest-1', 30),
        fold('bulk-fold-1'),
        rest('bulk-rest-2', 30),
        fold('bulk-fold-2'),
        rest('bulk-rest-3', 30),
        fold('bulk-fold-3'),
        { id: 'bulk-rest-4', kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room' },
        {
          id: 'bulk-check',
          kind: 'check',
          name: 'Check',
          presence: 'hands-on',
          environment: 'room',
          duration: { min: 5, max: 5 },
          cue: '+50 % volume',
        },
      ],
    },
    { id: 'shape', kind: 'shape', name: 'Shape', presence: 'hands-on', environment: 'room', duration: { min: 15, max: 15 } },
    {
      id: 'proof',
      kind: 'proof',
      name: 'Proof',
      fermentationBudget: { minutes: 90, temperature: 24 },
      children: [
        { id: 'proof-rest', kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room' },
        {
          id: 'proof-check',
          kind: 'check',
          name: 'Poke test',
          presence: 'hands-on',
          environment: 'room',
          duration: { min: 5, max: 5 },
          cue: 'dent springs back slowly',
        },
      ],
    },
    {
      id: 'bake',
      kind: 'bake',
      name: 'Bake',
      presence: 'attended',
      environment: 'oven',
      duration: { min: 45, max: 45 },
      inputs: [
        { id: 'preheat', kind: 'preheat', name: 'Preheat', presence: 'attended', environment: 'oven', duration: { min: 45, max: 45 } },
      ],
    },
  ],
}

const fridayFour = parseLocalTime('2026-10-02T16:00')

function input(overrides: Partial<PlanInput>): PlanInput {
  return {
    recipe: eightHourBulk,
    hacks,
    availability: morningAndEvening,
    kitchen: { temperature: 24 },
    now: fridayFour,
    mode: { kind: 'start-now' },
    ...overrides,
  }
}

function findStep(result: Plan, stepId: string): PlannedStep {
  const step = result.steps.find((planned) => planned.stepId === stepId)
  if (!step) throw new Error(`no step ${stepId} in plan ${result.hackIds.join('+')}`)
  return step
}

function at(minutes: number) {
  return formatLocalTime(minutes)
}

function expectInsideAvailability(plans: Plan[], availability: Availability) {
  for (const result of plans) {
    const ranges = listTimeRanges(availability, { start: result.start - 24 * HOUR, end: result.finish + 24 * HOUR })
    for (const step of result.steps) {
      if (step.presence === 'unattended') continue
      expect(isInsideAvailability(ranges, step), `${result.hackIds.join('+')} ${step.stepId} ${at(step.start)}`).toBe(true)
    }
  }
}

describe('plan, start now: the vision worked example', () => {
  const plans = plan(input({}))

  it('returns 2 to 3 plans, every hands-on and attended step inside availability', () => {
    expect(plans.length).toBeGreaterThanOrEqual(2)
    expect(plans.length).toBeLessThanOrEqual(3)
    expectInsideAvailability(plans, morningAndEvening)
    for (const result of plans) expect(result.start).toBe(fridayFour)
  })

  it('needs a hack: as written, the bulk check falls at about 00:30', () => {
    expect(plans.every((result) => result.hackIds.length > 0)).toBe(true)
  })

  // The vision expects a cold bulk that ends at about 08:00 and shaping in the morning. The only
  // cold bulk in hacks.md is 55-60 h; the vision's 8-16 h cold bulk is not validated. So the
  // validated list gives a cold final proof: shape in the evening, fridge overnight, bake in the morning.
  it('ranks the cold final proof first: folds in the evening, fridge overnight, bake in the morning', () => {
    const best = plans[0]
    if (!best) throw new Error('no plan')
    expect(best.hackIds).toEqual(['cold-final-proof'])

    expect(findStep(best, 'bulk-fold-3').end <= parseLocalTime('2026-10-02T19:00')).toBe(true)

    const fridge = best.steps.find((step) => step.environment === 'fridge')
    if (!fridge) throw new Error('no fridge step')
    expect(fridge.start >= parseLocalTime('2026-10-02T19:00') && fridge.start <= parseLocalTime('2026-10-02T22:00')).toBe(true)
    expect(fridge.end >= parseLocalTime('2026-10-03T06:00') && fridge.end <= parseLocalTime('2026-10-03T10:00')).toBe(true)

    const bake = findStep(best, 'bake')
    expect(bake.start >= parseLocalTime('2026-10-03T06:00') && bake.end <= parseLocalTime('2026-10-03T10:00')).toBe(true)
  })

  it('ends the preheat when the bake starts', () => {
    for (const result of plans) {
      const bake = result.steps.find((step) => step.kind === 'bake')
      const preheat = result.steps.find((step) => step.kind === 'preheat')
      expect(preheat?.end).toBe(bake?.start)
    }
  })

  it('ranks by fewest hacks first', () => {
    const counts = plans.map((result) => result.hackIds.length)
    expect(counts).toEqual([...counts].sort((left, right) => left - right))
  })

  it('never stacks two hacks that change the same thing on the same step', () => {
    for (const result of plans) {
      expect(result.hackIds.includes('cold-final-proof') && result.hackIds.includes('workday-cold-proof')).toBe(false)
      expect(result.hackIds.includes('cold-bulk') && result.hackIds.includes('cold-bulk-short-proof')).toBe(false)
    }
  })
})

describe('plan: deviation and time windows', () => {
  const best = plan(input({}))[0]
  if (!best) throw new Error('no plan')

  it('gives room fermentation a 25 % deviation and fixed steps none', () => {
    const lastRest = findStep(best, 'bulk-rest-4')
    // Room rests before it: 3 × 30 min. Filled at 1× speed.
    const roomFermentation = lastRest.end - lastRest.start + 3 * 30
    expect(lastRest.deviation).toBeCloseTo(0.25 * roomFermentation)
    expect(findStep(best, 'shape').deviation).toBe(0)
  })

  it('widens the start window of later steps by the deviation so far', () => {
    const shape = findStep(best, 'shape')
    const deviation = findStep(best, 'bulk-rest-4').deviation
    expect(shape.startWindow.start).toBeCloseTo(shape.start - deviation)
    expect(shape.startWindow.end).toBeCloseTo(shape.start + deviation)
  })

  it('lets a fridge step absorb earlier deviation: the plan picks when it ends', () => {
    const fridge = best.steps.find((step) => step.environment === 'fridge')
    if (!fridge) throw new Error('no fridge step')
    const next = best.steps.find((step) => step.start === fridge.end && step.stepId !== fridge.stepId)
    if (!next) throw new Error('no step after the fridge')
    expect(next.startWindow).toEqual({ start: next.start, end: next.start })
  })
})

describe('plan: recipe as written', () => {
  it('ranks the recipe without hacks first when it fits', () => {
    const [best] = plan(input({ availability: allDay }))
    expect(best?.hackIds).toEqual([])
    expect(best?.lengthChange).toBe(0)
  })

  it('fills the budget faster in a warmer kitchen', () => {
    const [best] = plan(input({ availability: allDay, kitchen: { temperature: 32 } }))
    if (!best) throw new Error('no plan')
    const lastRest = findStep(best, 'bulk-rest-4')
    // Twice the speed: 8 h budget in 4 h, minus 3 × 30 min of rests.
    expect(lastRest.end - lastRest.start).toBe(4 * HOUR - 90)
  })
})

describe('plan, ready by', () => {
  const finish = parseLocalTime('2026-10-04T09:00')
  const now = parseLocalTime('2026-10-02T12:00')
  const plans = plan(input({ now, mode: { kind: 'ready-by', finish } }))

  it('plans backward: every plan is done by the finish time and starts after now', () => {
    expect(plans.length).toBeGreaterThanOrEqual(2)
    for (const result of plans) {
      expect(result.finish <= finish, at(result.finish)).toBe(true)
      expect(result.steps.every((step) => step.start >= now)).toBe(true)
    }
    expectInsideAvailability(plans, morningAndEvening)
  })

  it('finishes every plan at most 2 h before the finish time', () => {
    for (const result of plans) expect(finish - result.finish, at(result.finish)).toBeLessThanOrEqual(2 * HOUR)
  })

  it('drops the plan without hacks: its latest fit is Saturday 19:00, 14 h early', () => {
    const best = plans[0]
    if (!best) throw new Error('no plan')
    expect(best.hackIds).toEqual(['cold-final-proof'])
  })

  it('returns no plan when none can finish inside the window', () => {
    const soon = parseLocalTime('2026-10-02T13:00')
    expect(plan(input({ now, mode: { kind: 'ready-by', finish: soon } }))).toEqual([])
  })
})

describe('plan: availability overrides', () => {
  it('keeps hands-on steps off a date the baker is away', () => {
    const awaySaturday: Availability = { ...morningAndEvening, overrides: [{ date: '2026-10-03', blocks: [] }] }
    const plans = plan(input({ availability: awaySaturday }))
    expectInsideAvailability(plans, awaySaturday)
    for (const result of plans) {
      for (const step of result.steps) {
        if (step.presence !== 'unattended') expect(at(step.start).startsWith('2026-10-03')).toBe(false)
      }
    }
  })
})

describe('plan: re-planning from a start state', () => {
  it('skips completed steps and fills only the rest of the budget', () => {
    const plans = plan(
      input({
        availability: allDay,
        now: parseLocalTime('2026-10-02T20:00'),
        startState: {
          completedStepIds: ['mix', 'bulk-rest-1', 'bulk-fold-1', 'bulk-rest-2', 'bulk-fold-2', 'bulk-rest-3', 'bulk-fold-3'],
          budgetFilled: { bulk: 0.5 },
        },
      }),
    )
    const best = plans[0]
    if (!best) throw new Error('no plan')
    expect(best.hackIds).toEqual([])
    expect(best.steps.map((step) => step.stepId)).not.toContain('mix')
    const lastRest = findStep(best, 'bulk-rest-4')
    expect(lastRest.start).toBe(parseLocalTime('2026-10-02T20:00'))
    expect(lastRest.end - lastRest.start).toBe(4 * HOUR)
  })
})

describe('plan: hacks on a step without children', () => {
  it('turns the cold proof of 9 to 5 into a 2-3 h room proof after a cold bulk', () => {
    const nineToFive = recipes.find((recipe) => recipe.id === 'nine-to-five') as Recipe
    const coldBulk = hacks.filter((hack) => hack.id === 'cold-bulk')
    const hacked = plan(input({ recipe: nineToFive, hacks: coldBulk, availability: allDay })).find(
      (result) => result.hackIds.length > 0,
    )
    if (!hacked) throw new Error('no plan with the cold bulk')
    const proof = hacked.steps.find((step) => step.kind === 'proof')
    expect(proof?.environment).toBe('room')
    expect(proof && proof.end - proof.start).toBe(2 * HOUR)
  })
})

describe('plan: a longer wait now lets a later step fit', () => {
  // The first rest must wait 75 min, not 60, or the bake after the 8.5 h proof starts before 16:00.
  const waiting: Recipe = {
    id: 'waiting',
    name: 'Two flexible rests',
    source: 'test fixture',
    levainPercent: 10,
    steps: [
      { id: 'mix', kind: 'mix', name: 'Mix', presence: 'hands-on', environment: 'room', duration: { min: 5, max: 5 } },
      { id: 'rest', kind: 'rest', name: 'Rest', presence: 'unattended', environment: 'room', duration: { min: HOUR, max: 10 * HOUR } },
      { id: 'shape', kind: 'shape', name: 'Shape', presence: 'hands-on', environment: 'room', duration: { min: 15, max: 15 } },
      { id: 'proof', kind: 'proof', name: 'Proof', presence: 'unattended', environment: 'room', duration: { min: 8 * HOUR, max: 8.5 * HOUR } },
      { id: 'bake', kind: 'bake', name: 'Bake', presence: 'attended', environment: 'oven', duration: { min: 30, max: 30 } },
    ],
  }

  it('finds the plan a shortest-first choice misses', () => {
    const now = parseLocalTime('2026-10-02T06:00')
    const [best] = plan(input({ recipe: waiting, hacks: [], now }))
    if (!best) throw new Error('no plan')
    expect(findStep(best, 'rest').end - findStep(best, 'rest').start).toBe(75)
    expect(at(findStep(best, 'bake').start)).toBe('2026-10-02T16:05')
  })
})

describe('findClosestPlan: never a dead end', () => {
  const monday = parseLocalTime('2026-10-05T00:00')
  const QUARTER_HOUR = 15

  // The ticket's sweep: every base recipe, a start every 15 min over one day, the vision's availability.
  it('finds a plan for every base recipe at every start time', () => {
    for (const recipe of recipes) {
      for (let now = monday; now < monday + 24 * HOUR; now += QUARTER_HOUR) {
        const request = input({ recipe, now })
        const plans = plan(request)
        const closest = plans.length > 0 ? plans[0] : findClosestPlan(request)
        expect(closest, `${recipe.id} at ${at(now)}`).toBeDefined()
      }
    }
  })

  it('starts later when the baker is away now', () => {
    const now = parseLocalTime('2026-10-05T11:00')
    const request = input({ recipe: recipes.find((recipe) => recipe.id === 'sauerteig-basic-brot') as Recipe, now })
    expect(plan(request)).toEqual([])
    const closest = findClosestPlan(request)
    if (!closest) throw new Error('no closest plan')
    expect(at(closest.start)).toBe('2026-10-05T16:00')
    expectInsideAvailability([closest], morningAndEvening)
    // The screen's one change: plan for bread ready by the closest plan's finish.
    const [readyBy] = plan({ ...request, mode: { kind: 'ready-by', finish: closest.finish } })
    expect(readyBy?.finish).toBe(closest.finish)
  })

  it('moves the finish time when no plan is ready by it', () => {
    const now = parseLocalTime('2026-10-02T12:00')
    const finish = parseLocalTime('2026-10-02T13:00')
    const closest = findClosestPlan(input({ now, mode: { kind: 'ready-by', finish } }))
    if (!closest) throw new Error('no closest plan')
    expect(closest.finish > finish).toBe(true)
    expect(closest.start >= now).toBe(true)
    expectInsideAvailability([closest], morningAndEvening)
  })

  it('finds nothing when the baker is never available', () => {
    const never: Availability = { weekPlan: everyDay([]), overrides: [] }
    expect(findClosestPlan(input({ availability: never }))).toBeUndefined()
  })
})
