// Rule-of-thumb fermentation model. Evidence: docs/research/fermentation-time-model.md
// and docs/creators/marcel-paa/hacks.md in timschoch/flexibeck.

/** Speed roughly doubles per 8 °C warmer (The Sourdough Journey FAQ). Trust it for 18-30 °C only. */
const DOUBLING_STEP_CELSIUS = 8

/**
 * How far a room fermentation step can run off its prediction, as a share of its length.
 * Assumed: the research doc gives ±25-50 % as an engineering guess, no source; this is its low end.
 */
export const DEVIATION_PERCENTAGE = 25

export function fermentationSpeed(temperature: number, referenceTemperature: number): number {
  return 2 ** ((temperature - referenceTemperature) / DOUBLING_STEP_CELSIUS)
}

// Bulk length by levain percent, Marcel Paa (hacks.md:8): 10 % gives 8-12 h, 20 % about 3-6 h.
// Midpoints; linear between them. No source gives a number outside 10-20 %.
const BULK_MINUTES_BY_LEVAIN_PERCENT = [
  { percent: 10, minutes: 600 },
  { percent: 20, minutes: 270 },
] as const

function bulkMinutes(percent: number): number {
  const [low, high] = BULK_MINUTES_BY_LEVAIN_PERCENT
  if (percent < low.percent || percent > high.percent) {
    throw new RangeError(`no bulk length known for ${percent} % levain`)
  }
  const share = (percent - low.percent) / (high.percent - low.percent)
  return low.minutes + share * (high.minutes - low.minutes)
}

/** Speed factor when the levain changes from `fromPercent` to `toPercent`. */
export function levainSpeed(fromPercent: number, toPercent: number): number {
  return bulkMinutes(fromPercent) / bulkMinutes(toPercent)
}
