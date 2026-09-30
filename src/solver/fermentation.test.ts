import { describe, expect, it } from 'vitest'
import { fermentationSpeed, levainSpeed } from './fermentation'

describe('fermentationSpeed', () => {
  it('is 1 at the reference temperature', () => {
    expect(fermentationSpeed(24, 24)).toBe(1)
  })

  it('doubles per 8 °C warmer and halves per 8 °C colder', () => {
    expect(fermentationSpeed(32, 24)).toBeCloseTo(2)
    expect(fermentationSpeed(16, 24)).toBeCloseTo(0.5)
  })
})

describe('levainSpeed', () => {
  it('uses the bulk lengths Marcel Paa gives for 10 % and 20 % levain', () => {
    // 10 % levain: 8-12 h bulk, 20 %: 3-6 h. Midpoints 10 h and 4.5 h.
    expect(levainSpeed(10, 20)).toBeCloseTo(10 / 4.5)
    expect(levainSpeed(20, 10)).toBeCloseTo(4.5 / 10)
  })

  it('interpolates between the two known points', () => {
    expect(levainSpeed(15, 20)).toBeCloseTo(7.25 / 4.5)
  })

  it('refuses levain outside 10 to 20 %: no source gives a number there', () => {
    expect(() => levainSpeed(25, 20)).toThrow(RangeError)
  })
})
