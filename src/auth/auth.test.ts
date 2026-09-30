import { describe, expect, it, vi } from 'vitest'

vi.mock('../db/client', () => ({ db: {} }))

const { auth } = await import('./auth')

describe('auth rate limit', () => {
  it('allows 50 sign-ups per hour on /sign-up/email', () => {
    expect(auth.options.rateLimit?.customRules?.['/sign-up/email']).toEqual({ window: 3600, max: 50 })
  })

  it('keeps the default rule for other paths', () => {
    expect(Object.keys(auth.options.rateLimit?.customRules ?? {})).toEqual(['/sign-up/email'])
  })
})
