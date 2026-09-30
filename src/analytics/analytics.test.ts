import posthog from 'posthog-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { identify, resetAnalytics, startAnalytics, track } from './analytics'

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), register: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}))

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards track to posthog capture with the event name and properties', () => {
    track('plan_accepted', { plan: 'weekend' })

    expect(posthog.capture).toHaveBeenCalledWith('plan_accepted', { plan: 'weekend' })
  })

  it('joins events before and after sign-in: identify passes the baker id to posthog', () => {
    identify('baker-1')

    expect(posthog.identify).toHaveBeenCalledWith('baker-1', undefined)
  })

  it('sets person properties with identify', () => {
    identify('baker-1', { experience: 'novice' })

    expect(posthog.identify).toHaveBeenCalledWith('baker-1', { experience: 'novice' })
  })

  it('starts a new anonymous person on reset', () => {
    resetAnalytics()

    expect(posthog.reset).toHaveBeenCalledTimes(1)
  })

  it('registers app_version as a super property', () => {
    startAnalytics()

    expect(posthog.register).toHaveBeenCalledWith({ app_version: 'test-sha' })
  })

  it('sends only named events', () => {
    startAnalytics()

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://posthog.test',
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
      }),
    )
  })

  it('keeps events from browser bots: opts out of the user agent filter', () => {
    startAnalytics()

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ opt_out_useragent_filter: true }),
    )
  })
})
