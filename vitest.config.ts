import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test-sha'),
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    env: {
      VITE_POSTHOG_HOST: 'https://posthog.test',
      VITE_POSTHOG_KEY: 'phc_test',
    },
  },
})
