import { defineConfig } from '@playwright/test'

const PORT = 3000

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: 'pnpm db:migrate && pnpm dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
