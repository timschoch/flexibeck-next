// Domain terms: CONTEXT.md in timschoch/flexibeck. Times are minutes on the baker's
// local wall clock (see time.ts); durations are minutes.

export type StepKind =
  | 'levain-build'
  | 'autolyse'
  | 'mix'
  | 'bulk'
  | 'rest'
  | 'fold'
  | 'check'
  | 'shape'
  | 'proof'
  | 'preheat'
  | 'bake'

export type Presence = 'hands-on' | 'attended' | 'unattended'

export type Environment = 'room' | 'fridge' | 'warm-spot' | 'oven'

/** Shortest and longest length a step may take. The plan picks one. */
export type PlannableDuration = { min: number; max: number }

export type Ingredient = { name: string; grams: number }

/**
 * Amount of fermentation a parent step needs, counted as 100 %. `minutes` is how long
 * its unattended room children take to fill it at `temperature` without hacks.
 */
export type FermentationBudget = { minutes: number; temperature: number }

type StepBase = {
  id: string
  kind: StepKind
  name: string
  /** Branches that run beside the main chain and end when this step starts. */
  inputs?: Step[]
}

/**
 * A step without children. An unattended room or warm-spot leaf without `duration`
 * inside a parent with a fermentation budget fills whatever the budget still needs.
 */
export type LeafStep = StepBase & {
  presence: Presence
  environment: Environment
  duration?: PlannableDuration
  /** On checks only: what "done" looks like. A cue outranks the clock. */
  cue?: string
  ingredients?: Ingredient[]
}

/** A step holding a chain of child steps. It lasts as long as its children together. */
export type ParentStep = StepBase & {
  children: Step[]
  fermentationBudget?: FermentationBudget
}

export type Step = LeafStep | ParentStep

export type Recipe = {
  id: string
  name: string
  /** Where the recipe comes from, a URL. */
  source: string
  /** Levain grams against flour grams of the main dough, in percent. */
  levainPercent: number
  /** The main chain, in order. Its last step gives the finished bread. */
  steps: Step[]
}

/**
 * How the baker does a hands-on step, named by step kind. A mix inside an autolyse or a
 * levain build is that technique, not `mix`.
 */
export type Technique = Extract<StepKind, 'levain-build' | 'autolyse' | 'mix' | 'fold' | 'shape'>

/** A creator video that shows one technique, from the chapter of that technique. */
export type TechniqueVideo = {
  technique: Technique
  title: string
  youtubeId: string
  /** Where the chapter of the technique starts. */
  startSeconds: number
  /** The creator's name, as the figure caption shows it. */
  creator: string
  /** The creator's page that embeds the video. */
  source: string
}

/** The steps an effect changes: by step kind, optional environment, and first, last or all. */
export type Target = {
  stepKind: StepKind
  environment?: Environment
  position: 'first' | 'last' | 'all'
}

export type Effect =
  /** Sets the levain to `percent`, which changes the fermentation speed of the target. */
  | { kind: 'levain'; target: Target; percent: number }
  /** The target may end once `budget` (0 to 1) of its fermentation budget is full. */
  | { kind: 'end-early'; target: Target; budget: number }
  /** After `roomMinutes` of room fermentation, the rest of the target moves to the fridge. */
  | { kind: 'move-to-fridge'; target: Target; roomMinutes: number; duration: PlannableDuration }
  /** The target becomes one unattended step with this duration; its checks stay. */
  | { kind: 'set-duration'; target: Target; environment: Environment; duration: PlannableDuration }
  /** Method switch: the target and every step after it are replaced by `steps`. */
  | { kind: 'replace-steps'; target: Target; steps: Step[] }
  | { kind: 'add-ingredient'; ingredient: Ingredient }

/** A fact that must be true before a hack can apply. */
export type Requirement = { kind: 'levain-percent'; min: number; max: number }

export type ImpactDimension = 'sourness' | 'aroma' | 'crumb' | 'crust' | 'volume' | 'effort'

/** How a hack changes the bread against the base recipe: -2 to +2 per dimension, plus a text. */
export type Impact = {
  scores: Partial<Record<ImpactDimension, -2 | -1 | 0 | 1 | 2>>
  text: string
}

export type Hack = {
  id: string
  name: string
  /** Line in docs/creators/marcel-paa/hacks.md (timschoch/flexibeck) and the creator's source. */
  source: string
  requirements: Requirement[]
  effects: Effect[]
  impact: Impact
  limits: string
  /** Hacks the creator pairs this one with. Informational: the solver stacks every pair without a conflict. */
  combinesWith: string[]
}

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/** One time range of availability, `HH:MM`. An `end` at or before `start` goes past midnight. */
export type AvailabilityBlock = { start: string; end: string }

/** Replaces the week plan on one date (`YYYY-MM-DD`). No blocks: the baker is away. */
export type DateOverride = { date: string; blocks: AvailabilityBlock[] }

export type Availability = {
  weekPlan: Record<Weekday, AvailabilityBlock[]>
  overrides: DateOverride[]
}

/** Absolute range in local wall-clock minutes, end exclusive. */
export type TimeRange = { start: number; end: number }

export type Kitchen = {
  /** Kitchen temperature in °C. */
  temperature: number
  /** Warm spot temperature in °C, if the baker has one. */
  warmSpotTemperature?: number
}

/** Where a bake stands, so the solver can re-plan from there. */
export type StartState = {
  completedStepIds: string[]
  /** Share (0 to 1) of each parent's fermentation budget already full, by parent id. */
  budgetFilled: Record<string, number>
}

export type PlanMode = { kind: 'start-now' } | { kind: 'ready-by'; finish: number }

export type PlanInput = {
  recipe: Recipe
  hacks: Hack[]
  availability: Availability
  kitchen: Kitchen
  now: number
  mode: PlanMode
  startState?: StartState
}

export type PlannedStep = {
  stepId: string
  parentId?: string
  kind: StepKind
  name: string
  presence: Presence
  environment: Environment
  cue?: string
  /** Predicted start and end. */
  start: number
  end: number
  /** Deviation of this step's own length, in minutes (one standard deviation). */
  deviation: number
  /** Predicted start ± the deviation piled up by earlier steps. */
  startWindow: TimeRange
}

export type Plan = {
  hackIds: string[]
  start: number
  finish: number
  finishWindow: TimeRange
  /** Planned length minus the length of the recipe as written, in minutes. */
  lengthChange: number
  steps: PlannedStep[]
}
