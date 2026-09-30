import posthog from 'posthog-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startAnalytics, track } from './analytics'

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), register: vi.fn(), capture: vi.fn() },
}))

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards track to posthog capture with the event name and properties', () => {
    track('plan_accepted', { plan: 'weekend' })

    expect(posthog.capture).toHaveBeenCalledWith('plan_accepted', { plan: 'weekend' })
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
})
