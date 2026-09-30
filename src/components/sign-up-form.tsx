import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../auth/auth-client'

export function SignUpForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    const { error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    setPending(false)
    if (error) {
      setErrorMessage(error.message ?? 'Could not create the account')
      return
    }
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
        <TextInput label="Name" name="name" autoComplete="name" required />
        <TextInput label="Email" name="email" type="email" autoComplete="email" required />
        <PasswordInput label="Password" name="password" autoComplete="new-password" minLength={8} required />
        <Button type="submit" loading={pending}>
          Create account
        </Button>
      </Stack>
    </form>
  )
}
