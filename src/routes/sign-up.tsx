import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { SignUpForm } from '../components/sign-up-form'

export const Route = createFileRoute('/sign-up')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/plan' })
  },
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <Container size="xs">
      <Stack>
        <Title order={1}>Sign up</Title>
        <SignUpForm />
        <Text>
          Have an account?{' '}
          <Anchor component={Link} to="/sign-in">
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </Container>
  )
}
