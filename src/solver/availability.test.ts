import { describe, expect, it } from 'vitest'
import { isInsideAvailability, listTimeRanges } from './availability'
import { formatLocalTime, parseLocalTime } from './time'
import type { Availability, AvailabilityBlock, TimeRange, Weekday } from './types'

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function everyDay(blocks: AvailabilityBlock[]): Availability['weekPlan'] {
  return Object.fromEntries(weekdays.map((weekday) => [weekday, blocks])) as Availability['weekPlan']
}

function format(ranges: TimeRange[]) {
  return ranges.map((range) => `${formatLocalTime(range.start)}..${formatLocalTime(range.end)}`)
}

const friday = parseLocalTime('2026-10-02T00:00')
const sunday = parseLocalTime('2026-10-04T00:00')

describe('listTimeRanges', () => {
  it('copies the week plan onto each date', () => {
    const availability: Availability = {
      weekPlan: everyDay([
        { start: '06:00', end: '10:00' },
        { start: '16:00', end: '22:00' },
      ]),
      overrides: [],
    }
    expect(format(listTimeRanges(availability, { start: friday, end: sunday }))).toEqual([
      '2026-10-02T06:00..2026-10-02T10:00',
      '2026-10-02T16:00..2026-10-02T22:00',
      '2026-10-03T06:00..2026-10-03T10:00',
      '2026-10-03T16:00..2026-10-03T22:00',
    ])
  })

  it('reads blocks per weekday', () => {
    const availability: Availability = {
      weekPlan: { ...everyDay([]), saturday: [{ start: '08:00', end: '12:00' }] },
      overrides: [],
    }
    expect(format(listTimeRanges(availability, { start: friday, end: sunday }))).toEqual([
      '2026-10-03T08:00..2026-10-03T12:00',
    ])
  })

  it('runs a block past midnight and merges it with the next one', () => {
    const availability: Availability = {
      weekPlan: everyDay([
        { start: '00:00', end: '01:00' },
        { start: '22:00', end: '00:00' },
      ]),
      overrides: [],
    }
    const ranges = listTimeRanges(availability, { start: friday, end: sunday })
    expect(format(ranges)).toContain('2026-10-02T22:00..2026-10-03T01:00')
  })

  it('replaces the week plan on an override date; no blocks means away', () => {
    const availability: Availability = {
      weekPlan: everyDay([{ start: '06:00', end: '10:00' }]),
      overrides: [{ date: '2026-10-03', blocks: [] }],
    }
    expect(format(listTimeRanges(availability, { start: friday, end: sunday }))).toEqual([
      '2026-10-02T06:00..2026-10-02T10:00',
    ])
  })
})

describe('isInsideAvailability', () => {
  const ranges = [{ start: 100, end: 200 }]

  it('is true only when the whole range lies inside one block', () => {
    expect(isInsideAvailability(ranges, { start: 100, end: 200 })).toBe(true)
    expect(isInsideAvailability(ranges, { start: 150, end: 201 })).toBe(false)
    expect(isInsideAvailability(ranges, { start: 90, end: 110 })).toBe(false)
  })
})
