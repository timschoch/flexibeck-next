import { Container, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/plan')({
  component: PlanPage,
})

function PlanPage() {
  return (
    <Container size="sm">
      <Title order={1}>Plan a bake</Title>
    </Container>
  )
}
