import { MantineProvider } from '@mantine/core'
import { render as renderBare } from '@testing-library/react'
import type { ReactNode } from 'react'
import { theme } from '../theme'

export function render(node: ReactNode) {
  return renderBare(<MantineProvider theme={theme}>{node}</MantineProvider>)
}
