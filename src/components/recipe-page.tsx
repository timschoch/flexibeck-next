import { Stack, Text } from '@mantine/core'
import { useEffect, useId } from 'react'
import { track } from '../analytics/analytics'
import { recipes } from '../solver/data/recipes'
import type { Recipe } from '../solver/types'
import classes from './plan-flow.module.css'
import { PlanFlowLayout } from './plan-flow-layout'

type OptionProps = { name: string; facts: string; onClick?: () => void }

function RecipeOption({ name, facts, onClick }: OptionProps) {
  const nameId = useId()
  const factsId = useId()
  return (
    <button
      type="button"
      className={classes.recipe}
      aria-labelledby={nameId}
      aria-describedby={factsId}
      disabled={!onClick}
      onClick={onClick}
    >
      <Text id={nameId} fw={700}>
        {name}
      </Text>
      <Text id={factsId} size="sm" c="dimmed">
        {facts}
      </Text>
    </button>
  )
}

function factsOf(recipe: Recipe): string {
  return `${recipe.levainPercent} % levain · ${new URL(recipe.source).hostname.replace('www.', '')}`
}

export function RecipePage({ onChoose }: { onChoose: (recipeId: string) => void }) {
  useEffect(() => {
    track('recipe_import_started')
  }, [])

  function handleChoose(recipeId: string) {
    track('recipe_imported', { recipe_id: recipeId, source: 'library' })
    onChoose(recipeId)
  }

  return (
    <PlanFlowLayout position={1} title="Choose a recipe">
      <Text>Pick a base recipe. Flexibeck fits its steps into your availability.</Text>
      <Stack gap="sm">
        {recipes.map((recipe) => (
          <RecipeOption key={recipe.id} name={recipe.name} facts={factsOf(recipe)} onClick={() => handleChoose(recipe.id)} />
        ))}
        <RecipeOption name="Import (coming soon)" facts="Your own recipe, from a link or from text" />
      </Stack>
    </PlanFlowLayout>
  )
}
