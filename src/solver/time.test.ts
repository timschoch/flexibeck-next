import { describe, expect, it } from 'vitest'
import { formatLocalTime, parseLocalTime } from './time'

describe('local time', () => {
  it('parses to minutes and formats back', () => {
    const minutes = parseLocalTime('2026-10-02T16:00')
    expect(formatLocalTime(minutes)).toBe('2026-10-02T16:00')
    expect(formatLocalTime(minutes + 9 * 60)).toBe('2026-10-03T01:00')
  })

  it('rejects text that is not YYYY-MM-DDTHH:MM', () => {
    expect(() => parseLocalTime('2026-10-02 16:00')).toThrow(RangeError)
  })
})
