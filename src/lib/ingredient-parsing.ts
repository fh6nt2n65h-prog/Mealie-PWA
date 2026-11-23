import type { IngredientFood, IngredientUnit, Pagination, ParsedIngredient, RecipeIngredient } from '@/types/mealie'
import { matchesFoodName, matchesUnitName, normalizeIngredientTerm, termVariants } from '@/lib/ingredient-terms'

// The subset of MealieApi this module needs, so it can be tested without a server.
export type IngredientParsingApi = {
  parseIngredients(ingredients: string[]): Promise<ParsedIngredient[]>
  getIngredientUnits(search: string): Promise<Pagination<IngredientUnit>>
  createIngredientUnit(payload: Pick<IngredientUnit, 'name' | 'abbreviation'>): Promise<IngredientUnit>
  getIngredientFoods(search: string): Promise<Pagination<IngredientFood>>
  createIngredientFood(payload: Pick<IngredientFood, 'name'>): Promise<IngredientFood>
}

// A freshly scraped ingredient: just text in `note`, no amount, unit or food.
export function isUnparsedIngredient(ingredient: RecipeIngredient) {
  return !ingredient.food && !ingredient.unit && !ingredient.quantity && Boolean(ingredient.note?.trim())
}

async function resolveTerm<T extends { id?: string | null }>(
  parsed: T | null | undefined,
  name: string | null | undefined,
  cache: Map<string, Promise<T | null>>,
  search: (term: string) => Promise<Pagination<T>>,
  create: (term: string) => Promise<T>,
  matches: (candidate: T, term: string) => boolean,
): Promise<T | null> {
  if (parsed?.id) return parsed

  const term = (name || '').trim()
  if (!term) return null

  const key = normalizeIngredientTerm(term)
  const cached = cache.get(key)
  if (cached) return cached

  const pending = (async () => {
    // Search the singular forms too: Mealie's search for "cups" may not return "cup".
    const findExisting = async () => {
      for (const variant of termVariants(key)) {
        const match = (await search(variant)).items.find((candidate) => candidate.id && matches(candidate, term))
        if (match) return match
      }
      return undefined
    }
    const existing = await findExisting()
    if (existing) return existing
    try {
      return await create(term)
    } catch (createErr) {
      // Mealie rejects near-duplicates; reuse the match it already has.
      const fallback = await findExisting()
      if (fallback) return fallback
      throw createErr
    }
  })()

  cache.set(key, pending)
  return pending
}

/**
 * Splits imported ingredient lines into quantity, unit and food with Mealie's parser.
 * Returns the new ingredient list, or null when nothing needed parsing or the parser
 * failed. Any single line that can't be resolved keeps its original text.
 */
export async function parseImportedIngredients(
  api: IngredientParsingApi,
  ingredients: RecipeIngredient[],
): Promise<RecipeIngredient[] | null> {
  const targets = ingredients
    .map((ingredient, index) => ({ ingredient, index }))
    .filter(({ ingredient }) => isUnparsedIngredient(ingredient))

  if (targets.length === 0) return null

  let parsed: ParsedIngredient[]
  try {
    parsed = await api.parseIngredients(targets.map(({ ingredient }) => ingredient.note!.trim()))
  } catch (err) {
    console.warn('Ingredient parser failed; keeping imported text as-is:', err)
    return null
  }

  if (!Array.isArray(parsed) || parsed.length !== targets.length) return null

  const unitCache = new Map<string, Promise<IngredientUnit | null>>()
  const foodCache = new Map<string, Promise<IngredientFood | null>>()
  const next = [...ingredients]
  let changed = false

  await Promise.all(targets.map(async ({ ingredient, index }, i) => {
    const result = parsed[i]?.ingredient
    if (!result || (!result.quantity && !result.unit?.name && !result.food?.name)) return

    try {
      const unit = await resolveTerm(
        result.unit, result.unit?.name, unitCache,
        (term) => api.getIngredientUnits(term),
        (term) => api.createIngredientUnit({ name: term, abbreviation: '' }),
        (candidate, term) => matchesUnitName(candidate, term),
      )
      const food = await resolveTerm(
        result.food, result.food?.name, foodCache,
        (term) => api.getIngredientFoods(term),
        (term) => api.createIngredientFood({ name: term }),
        (candidate, term) => matchesFoodName(candidate, term),
      )

      next[index] = {
        ...ingredient,
        quantity: result.quantity || null,
        unit,
        food,
        note: result.note?.trim() || null,
        originalText: ingredient.note!.trim(),
        display: undefined,
      }
      changed = true
    } catch (err) {
      console.warn(`Could not resolve parsed ingredient "${ingredient.note}"; keeping it as text:`, err)
    }
  }))

  return changed ? next : null
}
