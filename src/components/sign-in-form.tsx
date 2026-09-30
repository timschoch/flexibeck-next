import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { identify } from '../analytics/analytics'
import { authClient } from '../auth/auth-client'

export function SignInForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    const { data, error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    setPending(false)
    if (error) {
      setErrorMessage(error.message ?? 'Could not sign in')
      return
    }
    identify(data.user.id)
    await router.invalidate()
    await router.navigate({ to: '/plan' })
  }

  return (
    <form method="post" onSubmit={handleSubmit}>
      <Stack>
        {errorMessage && (
          <Alert color="red" role="alert">
            {errorMessage}
          </Alert>
        )}
        <TextInput label="Email" name="email" type="email" autoComplete="email" required />
        <PasswordInput label="Password" name="password" autoComplete="current-password" required />
        <Button type="submit" loading={pending}>
          Sign in
        </Button>
      </Stack>
    </form>
  )
}
