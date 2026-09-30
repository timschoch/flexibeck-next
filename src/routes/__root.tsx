import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import mantineStyles from '@mantine/core/styles.css?url'
import mantineDatesStyles from '@mantine/dates/styles.css?url'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { startAnalytics } from '../analytics/analytics'
import { fetchSession } from '../auth/session'
import { AppLayout } from '../components/app-layout'
import { theme } from '../theme'

export const Route = createRootRoute({
  beforeLoad: async () => ({ session: await fetchSession() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Flexibeck' },
    ],
    links: [
      { rel: 'stylesheet', href: mantineStyles },
      { rel: 'stylesheet', href: mantineDatesStyles },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  useEffect(() => {
    startAnalytics()
  }, [])

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <HeadContent />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <AppLayout />
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
