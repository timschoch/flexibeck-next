// The solver counts minutes on the baker's local wall clock (../solver/time). These helpers
// bring the browser's clock into that count and show it to the baker.

const MILLISECONDS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60

const dayTimeFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

/** The current minute on the wall clock of this browser. */
export function localNow(): number {
  const now = new Date()
  return Math.floor(now.getTime() / MILLISECONDS_PER_MINUTE) - now.getTimezoneOffset()
}

/** Minutes to weekday and clock, for example `Mon 06:00`. */
export function formatDayTime(minutes: number): string {
  return dayTimeFormat.format(new Date(Math.round(minutes) * MILLISECONDS_PER_MINUTE)).replace(',', '')
}

/** Two times, for example `Mon 06:00 to 06:15`. The second weekday shows only when it differs. */
export function formatDayTimeRange(start: number, end: number): string {
  const [startDay, startClock] = formatDayTime(start).split(' ')
  const [endDay, endClock] = formatDayTime(end).split(' ')
  return `${startDay} ${startClock} to ${startDay === endDay ? endClock : `${endDay} ${endClock}`}`
}

/** A length in minutes, for example `1 h 35 min`. */
export function formatLength(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / MINUTES_PER_HOUR)
  const rest = rounded % MINUTES_PER_HOUR
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
