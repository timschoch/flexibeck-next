// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { render } from '../test/render'
import { SurveyForm } from './survey-form'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

describe('SurveyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks how easy the first bake was on a scale from 1 to 7', () => {
    render(<SurveyForm />)

    const scale = screen.getByRole('radiogroup', { name: /^How easy was your first bake\?/ })
    const options = within(scale).getAllByRole('radio')
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    for (const score of ['1', '2', '3', '4', '5', '6', '7']) {
      expect(within(scale).getByRole('radio', { name: score })).toBeDefined()
    }
    expect(screen.getByText('1 = Very hard, 7 = Very easy')).toBeDefined()
    expect(screen.getByRole('textbox', { name: 'What was hard?' })).toBeDefined()
    expect(track).not.toHaveBeenCalled()
  })

  it('fires survey_answered once with the score and the comment, then says thank you', async () => {
    render(<SurveyForm />)

    await userEvent.click(screen.getByRole('radio', { name: '6' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'What was hard?' }), ' The folding ')
    await userEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('survey_answered', { question: 'seq', score: 6, comment: 'The folding' })
    expect(screen.getByText('Thank you')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Send answer' })).toBeNull()
  })

  it('sends an empty comment when the baker writes none', async () => {
    render(<SurveyForm />)

    await userEvent.click(screen.getByRole('radio', { name: '2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    expect(track).toHaveBeenCalledWith('survey_answered', { question: 'seq', score: 2, comment: '' })
  })

  it('sends nothing without a score', async () => {
    render(<SurveyForm />)

    await userEvent.type(screen.getByRole('textbox', { name: 'What was hard?' }), 'The folding')
    await userEvent.click(screen.getByRole('button', { name: 'Send answer' }))

    expect(track).not.toHaveBeenCalled()
    expect(screen.queryByText('Thank you')).toBeNull()
  })
})
