import { Container, Title } from '@mantine/core'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/plan')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/sign-in' })
  },
  component: PlanPage,
})

function PlanPage() {
  return (
    <Container size="sm">
      <Title order={1}>Plan a bake</Title>
    </Container>
  )
}
