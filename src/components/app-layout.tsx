import { Anchor, Button, Container, Group } from '@mantine/core'
import { Link, Outlet, useRouter, useRouteContext } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'

export function AppLayout() {
  const router = useRouter()
  const { session } = useRouteContext({ from: '__root__' })

  async function handleSignOut() {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/sign-in' })
  }

  return (
    <>
      <Container component="header" size="sm" py="sm">
        <Group justify="space-between">
          <Anchor component={Link} to="/" fw={700}>
            Flexibeck
          </Anchor>
          {session && (
            <Button variant="subtle" onClick={handleSignOut}>
              Sign out
            </Button>
          )}
        </Group>
      </Container>
      <Outlet />
    </>
  )
}
