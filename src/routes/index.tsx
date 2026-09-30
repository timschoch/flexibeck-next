import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link, createFileRoute } from '@tanstack/react-router'
import classes from './index.module.css'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <Container className={classes.home} size="sm">
      <Stack>
        <Title order={1}>Flexibeck</Title>
        <Text>Bake on your hours, not the dough's</Text>
        <Anchor component={Link} to="/plan">
          Start planning
        </Anchor>
      </Stack>
    </Container>
  )
}
