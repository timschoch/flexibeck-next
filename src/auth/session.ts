import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('./auth')
  return auth.api.getSession({ headers: getRequestHeaders() })
})
