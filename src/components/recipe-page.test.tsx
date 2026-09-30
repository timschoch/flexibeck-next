// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { track } from '../analytics/analytics'
import { recipes } from '../solver/data/recipes'
import { render } from '../test/render'
import { RecipePage } from './recipe-page'

vi.mock('../analytics/analytics', () => ({ track: vi.fn() }))

describe('RecipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires recipe_import_started once when the screen opens', () => {
    render(<RecipePage onChoose={vi.fn()} />)

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('recipe_import_started')
  })

  it('lists every base recipe and shows import as a disabled option', () => {
    render(<RecipePage onChoose={vi.fn()} />)

    for (const recipe of recipes) {
      expect(screen.getByRole('button', { name: recipe.name })).toBeDefined()
    }
    expect(screen.getByRole('button', { name: 'Import (coming soon)' })).toHaveProperty('disabled', true)
  })

  it('fires recipe_imported once with the recipe and the library source when the baker picks one', async () => {
    const onChoose = vi.fn()
    render(<RecipePage onChoose={onChoose} />)
    vi.mocked(track).mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Sauerteig Basic Brot' }))

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('recipe_imported', { recipe_id: 'sauerteig-basic-brot', source: 'library' })
    expect(onChoose).toHaveBeenCalledWith('sauerteig-basic-brot')
  })
})
