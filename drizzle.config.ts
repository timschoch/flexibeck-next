import { defineConfig } from 'drizzle-kit'
import { loadEnv } from 'vite'

// Local runs read .env.development.local; CI and Vercel set process.env, which wins.
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: env.DATABASE_URL! },
})
