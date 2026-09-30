import posthog from 'posthog-js'

export type AnalyticsEvent =
  | 'recipe_import_started'
  | 'recipe_imported'
  | 'availability_set'
  | 'plan_mode_chosen'
  | 'plans_shown'
  | 'plan_accepted'
  | 'first_reminder_done'

export function startAnalytics() {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  })
  posthog.register({ app_version: __APP_VERSION__ })
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  posthog.capture(event, properties)
}

/** Joins the events before and after sign-in into one person. */
export function identify(bakerId: string) {
  posthog.identify(bakerId)
}

/** After sign-out the next events belong to a new anonymous person. */
export function resetAnalytics() {
  posthog.reset()
}
