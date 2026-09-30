// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { findTechniqueVideo } from '../solver/data/technique-videos'
import type { TechniqueVideo } from '../solver/types'
import { fourHourPlan, plans } from '../test/fixtures'
import { render } from '../test/render'
import { TechniqueDemo, TechniqueDemos } from './technique-demo'

const [asWritten] = plans
const fold = findTechniqueVideo('basic-fold-1') as TechniqueVideo

function listFigureNames(): (string | null | undefined)[] {
  return screen.getAllByRole('figure').map((figure) => figure.querySelector('figcaption')?.textContent)
}

describe('TechniqueDemo', () => {
  it('is a figure named after the technique and the creator, and loads nothing before the play click', () => {
    render(<TechniqueDemo video={fold} />)

    expect(screen.getByRole('figure', { name: 'Stretch and fold, Marcel Paa' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Play video: Stretch and fold' })).toBeDefined()
    expect(document.querySelector('iframe')).toBeNull()
    for (const element of document.querySelectorAll('[src]')) {
      expect(element.getAttribute('src')).not.toMatch(/youtube|ytimg/)
    }
  })

  it('plays the video in a youtube-nocookie iframe at the chapter of the technique after the click', async () => {
    render(<TechniqueDemo video={fold} />)

    await userEvent.click(screen.getByRole('button', { name: 'Play video: Stretch and fold' }))

    const player = document.querySelector('iframe')
    expect(player?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/K4TdJsa1voI?start=179&autoplay=1')
    expect(player?.getAttribute('title')).toBe('Stretch and fold, Marcel Paa')
    expect(screen.queryByRole('button', { name: /^Play video/ })).toBeNull()
  })
})

describe('TechniqueDemos', () => {
  it('shows one figure for each technique of the steps, in the order of the steps', () => {
    render(<TechniqueDemos steps={asWritten!.steps} />)

    const section = screen.getByRole('region', { name: 'How it is done' })
    expect(within(section).getByRole('heading', { name: 'How it is done' })).toBeDefined()
    // The plan has two stretch and folds: one figure.
    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
  })

  it('shows the videos of a hack plan: the four-hour method has its own', async () => {
    render(<TechniqueDemos steps={fourHourPlan.steps} />)

    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
    await userEvent.click(screen.getByRole('button', { name: 'Play video: Shape' }))
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/ZdIlvbulBA8?start=130&autoplay=1')
  })

  it('shows a technique of several plans once, with the video of the first plan', async () => {
    render(<TechniqueDemos steps={[...asWritten!.steps, ...fourHourPlan.steps]} />)

    expect(listFigureNames()).toEqual(['Autolyse, Marcel Paa', 'Mix, Marcel Paa', 'Stretch and fold, Marcel Paa', 'Shape, Marcel Paa'])
    await userEvent.click(screen.getByRole('button', { name: 'Play video: Shape' }))
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/K4TdJsa1voI?start=191&autoplay=1')
  })

  it('shows nothing when no step has a video', () => {
    render(<TechniqueDemos steps={asWritten!.steps.filter((step) => step.presence !== 'hands-on')} />)

    expect(screen.queryByRole('region', { name: 'How it is done' })).toBeNull()
    expect(screen.queryByRole('figure')).toBeNull()
  })
})
