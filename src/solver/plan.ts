import { isInsideAvailability, listTimeRanges } from './availability'
import { DEVIATION_PERCENTAGE, fermentationSpeed, levainSpeed } from './fermentation'
import type {
  Effect,
  Environment,
  Hack,
  Kitchen,
  LeafStep,
  ParentStep,
  Plan,
  PlanInput,
  PlanMode,
  PlannableDuration,
  PlannedStep,
  Recipe,
  Requirement,
  StartState,
  Step,
  Target,
  TimeRange,
} from './types'

/** Grid for start times and for lengths the plan picks, in minutes. */
const SEARCH_STEP_MINUTES = 15
const MAX_PLANS = 3
/** Assumed: more than two stacked hacks drift too far from anything the creator tested. */
const MAX_HACKS_PER_PLAN = 2
/** In `ready-by` mode a plan finishes at most this early, never late. Owner's call. */
const MAX_EARLY_MINUTES = 2 * 60
/** How far `findClosestPlan` looks: one week, the length of the week plan. */
const SEARCH_HORIZON_MINUTES = 7 * 24 * 60
const PERCENT = 100
const EVERYWHERE: TimeRange[] = [{ start: -Infinity, end: Infinity }]

/** One leaf of the expanded recipe, ready to place on the clock. */
type Segment = {
  step: LeafStep
  parentId?: string
  /** The plan picks the length inside it. */
  duration: PlannableDuration
  /** The plan picks when it ends, so earlier deviation stops here. */
  absorbs: boolean
  /** Fills a fermentation budget: its deviation covers the parent's room fermentation. */
  fermenting: boolean
  /** Room fermentation of the same parent before this segment, in minutes. */
  roomBefore: number
  /** Branches that end when this segment starts. */
  inputs: Segment[][]
}

/** `branch` is empty on the main chain and a path for each input branch. */
type Placement = { segment: Segment; branch: string; start: number; end: number }

/** What the chosen hacks change on one main-chain step. */
type Change = {
  speed: number
  endEarly?: number
  fridge?: { roomMinutes: number; duration: PlannableDuration }
  body?: { environment: Environment; duration: PlannableDuration }
}

type Context = { kitchen: Kitchen; startState: StartState }

function isParent(step: Step): step is ParentStep {
  return 'children' in step
}

function listLeaves(steps: Step[]): LeafStep[] {
  return steps.flatMap((step) => (isParent(step) ? listLeaves(step.children) : [step]))
}

function environmentOf(step: Step): Environment {
  if (!isParent(step)) return step.environment
  const leaves = listLeaves(step.children)
  return (leaves.find((leaf) => leaf.presence === 'unattended') ?? leaves[0])?.environment ?? 'room'
}

function findTargets(steps: Step[], target: Target): Step[] {
  const matches = steps.filter(
    (step) => step.kind === target.stepKind && (!target.environment || environmentOf(step) === target.environment),
  )
  if (target.position === 'first') return matches.slice(0, 1)
  if (target.position === 'last') return matches.slice(-1)
  return matches
}

function isMet(requirement: Requirement, recipe: Recipe): boolean {
  return recipe.levainPercent >= requirement.min && recipe.levainPercent <= requirement.max
}

/** Two effects on one step conflict when they change the same property. */
function changedProperty(effect: Effect): 'speed' | 'length' {
  return effect.kind === 'levain' ? 'speed' : 'length'
}

/**
 * Applies a hack combination to the remaining main chain. Returns nothing when a hack
 * finds no target or two hacks change the same property of the same step (ADR 0002).
 */
function applyHacks(recipe: Recipe, remaining: Step[], combination: Hack[]) {
  let steps = remaining
  const owners = new Map<string, string>()
  const claim = (stepId: string, property: string, hackId: string) => {
    const key = `${stepId}:${property}`
    const owner = owners.get(key)
    if (owner && owner !== hackId) return false
    owners.set(key, hackId)
    return true
  }

  for (const hack of combination) {
    for (const effect of hack.effects) {
      if (effect.kind !== 'replace-steps') continue
      const [first] = findTargets(steps, { ...effect.target, position: 'first' })
      if (!first) return undefined
      steps = [...steps.slice(0, steps.indexOf(first)), ...effect.steps]
      for (const step of effect.steps) {
        if (!claim(step.id, 'speed', hack.id) || !claim(step.id, 'length', hack.id)) return undefined
      }
    }
  }

  const changes = new Map<string, Change>()
  for (const hack of combination) {
    for (const effect of hack.effects) {
      if (effect.kind === 'replace-steps' || effect.kind === 'add-ingredient') continue
      if (effect.kind === 'levain' && effect.percent === recipe.levainPercent) return undefined
      const targets = findTargets(steps, effect.target)
      if (targets.length === 0) return undefined
      for (const target of targets) {
        if (!claim(target.id, changedProperty(effect), hack.id)) return undefined
        const change = changes.get(target.id) ?? { speed: 1 }
        if (effect.kind === 'levain') change.speed *= levainSpeed(recipe.levainPercent, effect.percent)
        if (effect.kind === 'end-early') change.endEarly = effect.budget
        if (effect.kind === 'move-to-fridge') change.fridge = { roomMinutes: effect.roomMinutes, duration: effect.duration }
        if (effect.kind === 'set-duration') change.body = { environment: effect.environment, duration: effect.duration }
        changes.set(target.id, change)
      }
    }
  }
  return { steps, changes }
}

function segmentOf(step: LeafStep, parentId: string | undefined, context: Context): Segment {
  if (!step.duration) throw new Error(`step ${step.id} has no duration and no fermentation budget to fill`)
  const flexible = step.presence === 'unattended' && step.duration.min < step.duration.max
  const length = step.duration.max
  return {
    step,
    ...(parentId ? { parentId } : {}),
    duration: flexible ? step.duration : { min: length, max: length },
    absorbs: flexible,
    fermenting: false,
    roomBefore: 0,
    inputs: expandInputs(step, context),
  }
}

function expandInputs(step: Step, context: Context): Segment[][] {
  return (step.inputs ?? [])
    .filter((input) => !context.startState.completedStepIds.includes(input.id))
    .map((input) =>
      // A branch has no room to move: every length it could pick is fixed at its shortest.
      expand([input], new Map(), context).map((segment) => ({
        ...segment,
        duration: { min: segment.duration.min, max: segment.duration.min },
      })),
    )
}

function fillsBudget(step: LeafStep): boolean {
  return step.presence === 'unattended' && (step.environment === 'room' || step.environment === 'warm-spot')
}

function speedOf(step: LeafStep, parent: ParentStep, change: Change, kitchen: Kitchen): number {
  const temperature =
    step.environment === 'warm-spot' ? (kitchen.warmSpotTemperature ?? kitchen.temperature) : kitchen.temperature
  return fermentationSpeed(temperature, parent.fermentationBudget?.temperature ?? temperature) * change.speed
}

function synthesize(step: Step, environment: Environment, duration: PlannableDuration): LeafStep {
  return {
    id: `${step.id}-${environment}`,
    kind: 'rest',
    name: environment === 'fridge' ? `${step.name} in the fridge` : step.name,
    presence: 'unattended',
    environment,
    duration,
  }
}

function expandParent(parent: ParentStep, change: Change, context: Context): Segment[] {
  const leaves = listLeaves(parent.children).filter((leaf) => !context.startState.completedStepIds.includes(leaf.id))
  const plain = (leaf: LeafStep) => segmentOf(leaf, parent.id, context)
  const checks = (from: LeafStep[]) => from.filter((leaf) => leaf.kind === 'check').map(plain)

  if (change.body) return [plain(synthesize(parent, change.body.environment, change.body.duration)), ...checks(leaves)]

  const budget = parent.fermentationBudget
  if (!budget) return leaves.map(plain)
  const fixed = (leaf: LeafStep, length: number, roomBefore: number): Segment => ({
    ...plain({ ...leaf, duration: { min: length, max: length } }),
    roomBefore,
  })

  if (change.fridge) {
    const { roomMinutes, duration } = change.fridge
    const segments: Segment[] = []
    let room = 0
    let index = 0
    for (; index < leaves.length && room < roomMinutes; index++) {
      const leaf = leaves[index] as LeafStep
      if (!fillsBudget(leaf)) {
        segments.push(plain(leaf))
        continue
      }
      const length = Math.min(leaf.duration?.min ?? Infinity, roomMinutes - room)
      segments.push(fixed(leaf, length, room))
      room += length
    }
    return [...segments, plain(synthesize(parent, 'fridge', duration)), ...checks(leaves.slice(index))]
  }

  // Budget in minutes at the budget's own temperature, then spread over the room children.
  const filled = context.startState.budgetFilled[parent.id] ?? 0
  const fixedFill = leaves
    .filter((leaf) => fillsBudget(leaf) && leaf.duration)
    .reduce((sum, leaf) => sum + (leaf.duration?.min ?? 0) * speedOf(leaf, parent, change, context.kitchen), 0)
  const remaining = Math.max(0, budget.minutes * (1 - filled) - fixedFill)
  const earliest = Math.max(0, budget.minutes * ((change.endEarly ?? 1) - filled) - fixedFill)

  let room = 0
  return leaves.map((leaf) => {
    if (!fillsBudget(leaf)) return plain(leaf)
    if (leaf.duration) {
      const segment = fixed(leaf, leaf.duration.min, room)
      room += leaf.duration.min
      return segment
    }
    const speed = speedOf(leaf, parent, change, context.kitchen)
    const duration = { min: Math.round(earliest / speed), max: Math.round(remaining / speed) }
    const segment: Segment = {
      ...plain({ ...leaf, duration }),
      absorbs: false,
      fermenting: true,
      roomBefore: room,
    }
    room += duration.min
    return segment
  })
}

function expand(steps: Step[], changes: Map<string, Change>, context: Context): Segment[] {
  return steps
    .filter((step) => !context.startState.completedStepIds.includes(step.id))
    .flatMap((step) => {
      const change = changes.get(step.id) ?? { speed: 1 }
      if (!isParent(step)) {
        const body = change.body && synthesize(step, change.body.environment, change.body.duration)
        return [segmentOf(body ? { ...body, kind: step.kind, inputs: step.inputs } : step, undefined, context)]
      }
      const segments = expandParent(step, change, context)
      const [first] = segments
      if (first) first.inputs = [...expandInputs(step, context), ...first.inputs]
      return segments
    })
}

function totalLength(segments: Segment[], pick: 'min' | 'max'): number {
  return segments.reduce((sum, segment) => sum + segment.duration[pick], 0)
}

/** Time the branches of the first segment need before it can start. */
function leadOf(segments: Segment[]): number {
  return Math.max(0, ...(segments[0]?.inputs ?? []).map((branch) => totalLength(branch, 'max')))
}

function listLengths(duration: PlannableDuration): number[] {
  const lengths: number[] = []
  for (let length = duration.min; length < duration.max; length += SEARCH_STEP_MINUTES) lengths.push(length)
  return [...lengths, duration.max]
}

/**
 * Places the segments forward from `start`. A segment with a range of lengths takes the
 * shortest one that lets every segment after it fit into availability. Nothing when none does.
 */
function place(
  segments: Segment[],
  start: number,
  ranges: TimeRange[],
  notBefore: number,
  branch = '',
): Placement[] | undefined {
  const isAllowed = (segment: Segment, range: TimeRange) =>
    range.start >= notBefore && (segment.step.presence === 'unattended' || isInsideAvailability(ranges, range))

  const placeInputs = (segment: Segment, end: number) => {
    const placements: Placement[] = []
    for (const [index, input] of segment.inputs.entries()) {
      const placed = place(input, end - totalLength(input, 'max'), ranges, notBefore, `${branch}/${segment.step.id}:${index}`)
      if (!placed) return undefined
      placements.push(...placed)
    }
    return placements
  }

  // Where the rest of the chain cannot fit, by segment index and start time: each is tried once.
  const dead = new Set<string>()
  const placeFrom = (index: number, time: number): Placement[] | undefined => {
    const segment = segments[index]
    if (!segment) return []
    const key = `${index}@${time}`
    if (dead.has(key)) return undefined
    const inputs = placeInputs(segment, time)
    if (inputs) {
      for (const length of listLengths(segment.duration)) {
        const range = { start: time, end: time + length }
        const rest = isAllowed(segment, range) && placeFrom(index + 1, range.end)
        if (rest) return [...inputs, { segment, branch, ...range }, ...rest]
      }
    }
    dead.add(key)
    return undefined
  }
  return placeFrom(0, start)
}

function deviationOf(placement: Placement): number {
  const { segment, start, end } = placement
  return segment.fermenting ? ((segment.roomBefore + end - start) * DEVIATION_PERCENTAGE) / PERCENT : 0
}

function toPlan(placements: Placement[], hackIds: string[], baseline: number): Plan {
  // Deviation piles up along each chain on its own: a branch does not shift the main chain.
  const variances = new Map<string, number>()
  const planned = placements.map((placement): PlannedStep => {
    const { segment, branch, start, end } = placement
    const variance = variances.get(branch) ?? 0
    const spread = Math.sqrt(variance)
    const deviation = deviationOf(placement)
    variances.set(branch, segment.absorbs ? 0 : variance + deviation ** 2)
    return {
      stepId: segment.step.id,
      ...(segment.parentId ? { parentId: segment.parentId } : {}),
      kind: segment.step.kind,
      name: segment.step.name,
      presence: segment.step.presence,
      environment: segment.step.environment,
      ...(segment.step.cue ? { cue: segment.step.cue } : {}),
      start,
      end,
      deviation,
      startWindow: { start: start - spread, end: start + spread },
    }
  })
  // A rest of 0 min is no step for the baker; its deviation is already counted.
  const steps = planned.filter((step) => step.end > step.start).sort((left, right) => left.start - right.start)
  const start = Math.min(...steps.map((step) => step.start))
  const finish = Math.max(...steps.map((step) => step.end))
  const spread = Math.sqrt(variances.get('') ?? 0)
  return {
    hackIds,
    start,
    finish,
    finishWindow: { start: finish - spread, end: finish + spread },
    lengthChange: finish - start - baseline,
    steps,
  }
}

function listCombinations(hacks: Hack[], size: number): Hack[][] {
  if (size === 0) return [[]]
  return hacks.flatMap((hack, index) =>
    listCombinations(hacks.slice(index + 1), size - 1).map((rest) => [hack, ...rest]),
  )
}

function spanOf(placements: Placement[]): number {
  return Math.max(...placements.map((placement) => placement.end)) - Math.min(...placements.map((placement) => placement.start))
}

/** One hack combination, expanded and ready to place. */
type Candidate = { segments: Segment[]; lead: number; longest: number; hackIds: string[]; baseline: number }

function listCandidates(input: PlanInput): Candidate[] {
  const context: Context = {
    kitchen: input.kitchen,
    startState: input.startState ?? { completedStepIds: [], budgetFilled: {} },
  }
  const remaining = input.recipe.steps.filter((step) => !context.startState.completedStepIds.includes(step.id))
  const asWritten = expand(remaining, new Map(), context)
  const baseline = asWritten.length > 0 ? spanOf(place(asWritten, 0, EVERYWHERE, -Infinity) ?? []) : 0

  const applicable = input.hacks.filter((hack) => hack.requirements.every((requirement) => isMet(requirement, input.recipe)))
  const combinations = Array.from({ length: MAX_HACKS_PER_PLAN + 1 }, (_, size) => listCombinations(applicable, size)).flat()

  return combinations.flatMap((combination) => {
    const applied = applyHacks(input.recipe, remaining, combination)
    if (!applied) return []
    const segments = expand(applied.steps, applied.changes, context)
    if (segments.length === 0) return []
    const lead = leadOf(segments)
    return [{ segments, lead, longest: lead + totalLength(segments, 'max'), hackIds: combination.map((hack) => hack.id), baseline }]
  })
}

/** The first start on the search grid at or after `time`. */
function roundUp(time: number): number {
  return Math.ceil(time / SEARCH_STEP_MINUTES) * SEARCH_STEP_MINUTES
}

/** Fewest hacks, least change in length, then finish time. */
function rank(plans: Plan[], mode: PlanMode): Plan[] {
  const finishScore = (result: Plan) => (mode.kind === 'ready-by' ? mode.finish - result.finish : result.finish)
  return plans.sort(
    (left, right) =>
      left.hackIds.length - right.hackIds.length ||
      Math.abs(left.lengthChange) - Math.abs(right.lengthChange) ||
      finishScore(left) - finishScore(right),
  )
}

/**
 * Fits a recipe into the baker's availability. Tries hack combinations (and start times in
 * `ready-by` mode), keeps plans whose hands-on and attended steps lie inside availability,
 * and returns up to three, ranked by fewest hacks, least change in length, then finish time.
 * In `ready-by` mode a plan must finish inside `MAX_EARLY_MINUTES` before the finish time;
 * when none does, the result is empty.
 */
export function plan(input: PlanInput): Plan[] {
  const plans = listCandidates(input).flatMap(({ segments, lead, longest, hackIds, baseline }) => {
    if (input.mode.kind === 'start-now') {
      const start = input.now + lead
      const ranges = listTimeRanges(input.availability, { start: input.now, end: start + longest })
      const placements = place(segments, start, ranges, input.now)
      return placements ? [toPlan(placements, hackIds, baseline)] : []
    }

    const { finish } = input.mode
    const window: TimeRange = { start: finish - MAX_EARLY_MINUTES, end: finish }
    const ranges = listTimeRanges(input.availability, { start: input.now, end: finish })
    let best: Plan | undefined
    for (let start = roundUp(input.now + lead); start < finish; start += SEARCH_STEP_MINUTES) {
      const placements = place(segments, start, ranges, input.now)
      if (!placements) continue
      const candidate = toPlan(placements, hackIds, baseline)
      const fits = candidate.finish >= window.start && candidate.finish <= window.end
      if (fits && (!best || candidate.finish >= best.finish)) best = candidate
    }
    return best ? [best] : []
  })
  return rank(plans, input.mode).slice(0, MAX_PLANS)
}

/**
 * For when `plan` finds nothing: the plan nearest to what the baker asked for, found by moving
 * the time. `start-now`: the earliest later start. `ready-by`: the finish closest to the finish
 * time, earlier or later. Nothing when no start within `SEARCH_HORIZON_MINUTES` fits.
 */
export function findClosestPlan(input: PlanInput): Plan | undefined {
  const { mode } = input
  const target = mode.kind === 'ready-by' ? mode.finish : input.now
  const distanceOf = (result: Plan) => (mode.kind === 'ready-by' ? Math.abs(result.finish - target) : result.start - input.now)

  const plans = listCandidates(input).flatMap(({ segments, lead, longest, hackIds, baseline }) => {
    const last = target + SEARCH_HORIZON_MINUTES
    const ranges = listTimeRanges(input.availability, { start: input.now, end: last + longest })
    let best: Plan | undefined
    for (let start = roundUp(input.now + lead); start < last; start += SEARCH_STEP_MINUTES) {
      // Every later start finishes later still: no closer plan follows.
      if (best && start - lead - target > distanceOf(best)) break
      const placements = place(segments, start, ranges, input.now)
      if (!placements) continue
      const candidate = toPlan(placements, hackIds, baseline)
      if (!best || distanceOf(candidate) < distanceOf(best)) best = candidate
    }
    return best ? [best] : []
  })
  const [closest] = rank(plans, mode).sort((left, right) => distanceOf(left) - distanceOf(right))
  return closest
}
