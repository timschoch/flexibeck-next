import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseLocalTime } from '../solver/time'
import { formatDayTime, formatDayTimeRange, formatLength, localNow } from './local-time'

describe('localNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("gives the minutes of the baker's wall clock", () => {
    vi.useFakeTimers()
    // Local time constructor: whatever the machine's time zone, the wall clock reads 06:30.
    vi.setSystemTime(new Date(2026, 9, 5, 6, 30, 40))

    expect(localNow()).toBe(parseLocalTime('2026-10-05T06:30'))
  })
})

describe('formatDayTime', () => {
  it('shows the weekday and the clock', () => {
    expect(formatDayTime(parseLocalTime('2026-10-05T06:00'))).toBe('Mon 06:00')
    expect(formatDayTime(parseLocalTime('2026-10-08T17:48'))).toBe('Thu 17:48')
  })
})

describe('formatDayTimeRange', () => {
  it('names the weekday once when both times are on one day', () => {
    expect(formatDayTimeRange(parseLocalTime('2026-10-05T06:00'), parseLocalTime('2026-10-05T06:15'))).toBe('Mon 06:00 to 06:15')
  })

  it('names both weekdays past midnight', () => {
    expect(formatDayTimeRange(parseLocalTime('2026-10-05T23:50'), parseLocalTime('2026-10-06T00:05'))).toBe(
      'Mon 23:50 to Tue 00:05',
    )
  })
})

describe('formatLength', () => {
  it('shows hours and minutes, and leaves out what is zero', () => {
    expect(formatLength(45)).toBe('45 min')
    expect(formatLength(120)).toBe('2 h')
    expect(formatLength(95.4)).toBe('1 h 35 min')
  })
})
