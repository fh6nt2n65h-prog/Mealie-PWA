import type { RecipeIngredient } from '@/types/mealie'

export function normalizeIngredientTerm(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

// Mealie enforces UniqueConstraint("name", "group_id") on both ingredient_foods and
// ingredient_units, so creating a near-duplicate ("cloves" when "clove" exists) fails
// the whole save with a 400. Accept simple singular/plural variants as the same term.
export function termVariants(value: string) {
  const variants = new Set([value])
  if (value.endsWith('es')) variants.add(value.slice(0, -2))
  if (value.endsWith('s')) variants.add(value.slice(0, -1))
  return variants
}

export function matchesUnitName(unit: RecipeIngredient['unit'], value: string) {
  const normalized = normalizeIngredientTerm(value)

  if (!normalized || !unit) {
    return false
  }

  const wanted = termVariants(normalized)
  return [unit.name, unit.abbreviation, unit.pluralName, unit.pluralAbbreviation]
    .some((candidate) => {
      const candidateNormalized = normalizeIngredientTerm(candidate)
      return candidateNormalized && wanted.has(candidateNormalized)
    })
}

export function matchesFoodName(food: RecipeIngredient['food'], value: string) {
  const normalized = normalizeIngredientTerm(value)

  if (!normalized || !food) {
    return false
  }

  const wanted = termVariants(normalized)
  return [food.name, food.pluralName]
    .some((candidate) => {
      const candidateNormalized = normalizeIngredientTerm(candidate)
      return candidateNormalized && wanted.has(candidateNormalized)
    })
}
