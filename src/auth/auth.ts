import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { experienceSchema } from './experience'

const LOCAL_ORIGIN = 'http://localhost:3000'

// Vercel hosts come without a scheme. Production URL, this deployment, this branch.
const deploymentOrigins = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
]
  .filter((host) => host !== undefined)
  .map((host) => `https://${host}`)

export const auth = betterAuth({
  baseURL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : LOCAL_ORIGIN,
  trustedOrigins: [LOCAL_ORIGIN, ...deploymentOrigins],
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  user: { additionalFields: { experience: { type: 'string', required: true, validator: { input: experienceSchema } } } },
  rateLimit: { enabled: true, storage: 'database' },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  plugins: [tanstackStartCookies()],
})
