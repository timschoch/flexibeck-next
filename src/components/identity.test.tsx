// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { identify, resetAnalytics, track } from '../analytics/analytics'
import { authClient } from '../auth/auth-client'
import { render } from '../test/render'
import { AppLayout } from './app-layout'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'

vi.mock('../analytics/analytics', () => ({ identify: vi.fn(), resetAnalytics: vi.fn(), track: vi.fn() }))
vi.mock('../auth/auth-client', () => ({
  authClient: { signIn: { email: vi.fn() }, signUp: { email: vi.fn() }, signOut: vi.fn() },
}))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
  useRouteContext: () => ({ session: { user: { id: 'baker-1' } } }),
  Link: 'a',
  Outlet: () => null,
}))

const signedIn = { data: { user: { id: 'baker-1' } }, error: null }
const refused = { data: null, error: { message: 'Wrong password' } }

async function fillCredentials() {
  await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'baker@example.com')
  await userEvent.type(screen.getByLabelText(/^Password/), 'sourdough-123')
}

describe('analytics identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('identifies the baker after sign-in', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue(signedIn as never)
    render(<SignInForm />)

    await fillCredentials()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(identify).toHaveBeenCalledTimes(1)
    expect(identify).toHaveBeenCalledWith('baker-1')
  })

  it('identifies nobody when sign-in fails', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue(refused as never)
    render(<SignInForm />)

    await fillCredentials()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(identify).not.toHaveBeenCalled()
  })

  it('identifies the baker with the experience, then fires signed_up', async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue(signedIn as never)
    render(<SignUpForm />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Baker')
    await fillCredentials()
    const experience = screen.getByRole('radiogroup', { name: /^How much baking experience do you have\?/ })
    expect(within(experience).getAllByRole('radio')).toHaveLength(3)
    await userEvent.click(within(experience).getByRole('radio', { name: 'Intermediate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(authClient.signUp.email).toHaveBeenCalledWith(expect.objectContaining({ experience: 'intermediate' }))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('signed_up')
    expect(identify).toHaveBeenCalledTimes(1)
    expect(identify).toHaveBeenCalledWith('baker-1', { experience: 'intermediate' })
    expect(vi.mocked(identify).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(track).mock.invocationCallOrder[0]!)
  })

  it('creates no account without the experience', async () => {
    render(<SignUpForm />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Baker')
    await fillCredentials()
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(authClient.signUp.email).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('fires nothing when sign-up fails', async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue(refused as never)
    render(<SignUpForm />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Baker')
    await fillCredentials()
    await userEvent.click(screen.getByRole('radio', { name: 'Novice' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert')).toBeDefined()
    expect(track).not.toHaveBeenCalled()
    expect(identify).not.toHaveBeenCalled()
  })

  it('resets the identity on sign-out', async () => {
    vi.mocked(authClient.signOut).mockResolvedValue({ data: { success: true }, error: null } as never)
    render(<AppLayout />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(resetAnalytics).toHaveBeenCalledTimes(1)
  })
})
