import { formatLocalTime } from './time'
import type { Availability, AvailabilityBlock, TimeRange, Weekday } from './types'

const MINUTES_PER_DAY = 24 * 60
const MINUTES_PER_HOUR = 60
// Day 0 of the local-minute count, 1970-01-01, was a Thursday.
const WEEKDAYS_FROM_EPOCH: Weekday[] = ['thursday', 'friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday']

function parseClock(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number)
  return hours * MINUTES_PER_HOUR + minutes
}

function listBlocks(availability: Availability, dayStart: number): AvailabilityBlock[] {
  const date = formatLocalTime(dayStart).slice(0, 10)
  const override = availability.overrides.find((candidate) => candidate.date === date)
  if (override) return override.blocks
  const weekday = WEEKDAYS_FROM_EPOCH[(dayStart / MINUTES_PER_DAY) % WEEKDAYS_FROM_EPOCH.length]
  return weekday ? availability.weekPlan[weekday] : []
}

/**
 * Availability as absolute time ranges touching `range`, sorted, with touching blocks merged.
 * Starts one day early so a block past midnight reaches into the range.
 */
export function listTimeRanges(availability: Availability, range: TimeRange): TimeRange[] {
  const ranges: TimeRange[] = []
  const firstDay = Math.floor(range.start / MINUTES_PER_DAY) * MINUTES_PER_DAY - MINUTES_PER_DAY
  for (let dayStart = firstDay; dayStart < range.end; dayStart += MINUTES_PER_DAY) {
    for (const block of listBlocks(availability, dayStart)) {
      const start = dayStart + parseClock(block.start)
      const clockEnd = dayStart + parseClock(block.end)
      ranges.push({ start, end: clockEnd > start ? clockEnd : clockEnd + MINUTES_PER_DAY })
    }
  }
  ranges.sort((left, right) => left.start - right.start)

  const merged: TimeRange[] = []
  for (const next of ranges) {
    const last = merged.at(-1)
    if (last && next.start <= last.end) last.end = Math.max(last.end, next.end)
    else merged.push({ ...next })
  }
  return merged.filter((merge) => merge.end > range.start && merge.start < range.end)
}

/** True when `range` lies inside one availability range. */
export function isInsideAvailability(ranges: TimeRange[], range: TimeRange): boolean {
  return ranges.some((available) => available.start <= range.start && range.end <= available.end)
}
