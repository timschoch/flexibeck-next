import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { SignInForm } from '../components/sign-in-form'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/plan' })
  },
  component: SignInPage,
})

function SignInPage() {
  return (
    <Container size="xs">
      <Stack>
        <Title order={1}>Sign in</Title>
        <SignInForm />
        <Text>
          New here?{' '}
          <Anchor component={Link} to="/sign-up">
            Create an account
          </Anchor>
        </Text>
      </Stack>
    </Container>
  )
}
