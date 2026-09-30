import { Alert, Button, PasswordInput, Radio, Stack, TextInput } from '@mantine/core'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { identify, track } from '../analytics/analytics'
import { authClient } from '../auth/auth-client'
import { experienceSchema } from '../auth/experience'

export function SignUpForm() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const experience = experienceSchema.safeParse(form.get('experience'))
    if (!experience.success) {
      setErrorMessage('Choose your baking experience')
      return
    }
    setPending(true)
    const { data, error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      experience: experience.data,
    })
    setPending(false)
    if (error) {
      setErrorMessage(error.message ?? 'Could not create the account')
      return
    }
    track('signed_up')
    identify(data.user.id, { experience: experience.data })
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
        <Radio.Group label="How much baking experience do you have?" name="experience" required>
          <Stack gap="xs" mt="xs">
            <Radio value="novice" label="Novice" required />
            <Radio value="intermediate" label="Intermediate" required />
            <Radio value="experienced" label="Experienced" required />
          </Stack>
        </Radio.Group>
        <Button type="submit" loading={pending}>
          Create account
        </Button>
      </Stack>
    </form>
  )
}
