import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import mantineStyles from '@mantine/core/styles.css?url'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { startAnalytics } from '../analytics/analytics'
import { theme } from '../theme'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Flexibeck' },
    ],
    links: [{ rel: 'stylesheet', href: mantineStyles }],
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
          <Outlet />
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  )
}
