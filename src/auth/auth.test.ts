import { describe, expect, it, vi } from 'vitest'

vi.mock('../db/client', () => ({ db: {} }))

const { auth } = await import('./auth')

describe('auth rate limit', () => {
  it('allows a burst of 10 sign-ups, reset after 5 s, on /sign-up/email', () => {
    expect(auth.options.rateLimit?.customRules?.['/sign-up/email']).toEqual({ window: 5, max: 10 })
  })

  it('keeps the default rule for other paths', () => {
    expect(Object.keys(auth.options.rateLimit?.customRules ?? {})).toEqual(['/sign-up/email'])
  })
})
