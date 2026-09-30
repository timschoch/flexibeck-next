// The solver counts time in minutes on the baker's local wall clock, so plans do not
// depend on the machine's time zone. A day always has 24 h: daylight saving is ignored.

const MILLISECONDS_PER_MINUTE = 60_000
const LOCAL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** `YYYY-MM-DDTHH:MM` to minutes. */
export function parseLocalTime(text: string): number {
  const match = LOCAL_TIME_PATTERN.exec(text)
  if (!match) throw new RangeError(`not a local time (YYYY-MM-DDTHH:MM): ${text}`)
  const [, year, month, day, hours, minutes] = match.map(Number) as number[] as [number, number, number, number, number, number]
  return Date.UTC(year, month - 1, day, hours, minutes) / MILLISECONDS_PER_MINUTE
}

/** Minutes to `YYYY-MM-DDTHH:MM`. */
export function formatLocalTime(minutes: number): string {
  return new Date(Math.round(minutes) * MILLISECONDS_PER_MINUTE).toISOString().slice(0, 16)
}
