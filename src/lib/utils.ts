import dayjs from 'dayjs'
import type { Recipe, RecipeSummary, ShoppingListItem, RecipeIngredient } from '@/types/mealie'

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

export function buildApiBaseUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/api`
}

function getRecipeImageVersion(recipe: Recipe | RecipeSummary) {
  return typeof recipe.image === 'string' ? recipe.image : ''
}

export function getRecipeImageUrl(baseUrl: string, recipe: Recipe | RecipeSummary, size: 'original' | 'small' = 'original') {
  if (typeof recipe.image === 'string' && recipe.image.startsWith('http')) {
    return recipe.image
  }

  if (!recipe.id) {
    return null
  }

  const version = getRecipeImageVersion(recipe)
  const fileName = size === 'small' ? 'min-original.webp' : 'original.webp'
  const params = new URLSearchParams()

  if (version) {
    params.set('version', version)
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''

  return `${buildApiBaseUrl(baseUrl)}/media/recipes/${recipe.id}/images/${fileName}${suffix}`
}

export function formatDuration(value?: string | null) {
  if (!value) {
    return 'Time flexible'
  }

  const match = value.match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/)

  if (!match) {
    return value
  }

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const parts = []

  if (hours) {
    parts.push(`${hours}h`)
  }

  if (minutes) {
    parts.push(`${minutes}m`)
  }

  return parts.join(' ') || 'Quick dish'
}

export function formatDayLabel(date: string) {
  return dayjs(date).format('ddd D')
}

export function formatSectionDate(date: string) {
  return dayjs(date).format('dddd, MMMM D')
}

export function formatRelativeCookedDate(value?: string | null) {
  if (!value) {
    return 'Not cooked yet'
  }

  return `Cooked ${dayjs(value).format('MMM D')}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function toIngredientText(recipe: Recipe) {
  return recipe.recipeIngredient
    .map((ingredient) => {
      const parts = [
        ingredient.display,
        ingredient.quantity?.toString(),
        ingredient.unit?.abbreviation || ingredient.unit?.name,
        ingredient.food?.name,
        ingredient.note,
        ingredient.title,
        ingredient.originalText
      ]

      return parts.filter(Boolean).join(' ')
    })
    .join(' ')
    .toLowerCase()
}

export function matchesRecipeQuery(recipe: Recipe, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  const title = recipe.name?.toLowerCase() || ''
  const ingredients = toIngredientText(recipe)

  return title.includes(normalizedQuery) || ingredients.includes(normalizedQuery)
}

export function getShoppingItemText(item: ShoppingListItem) {
  return item.display || item.food?.name || item.note || 'Untitled item'
}

export function buildRemindersShortcutUrl(items: ShoppingListItem[]) {
  const payload = items
    .filter((item) => !item.checked)
    .map((item) => getShoppingItemText(item))
    .join('\n')

  const params = new URLSearchParams({
    name: 'Add to Reminders',
    input: 'text',
    text: payload
  })

  return `shortcuts://run-shortcut?${params.toString()}`
}

export function getIngredientDisplayText(ingredient: RecipeIngredient): string {
  const parts: string[] = []

  if (ingredient.quantity !== null && ingredient.quantity !== undefined) {
    parts.push(ingredient.quantity.toString())
  }

  if (ingredient.unit?.abbreviation) {
    parts.push(ingredient.unit.abbreviation)
  } else if (ingredient.unit?.name) {
    parts.push(ingredient.unit.name)
  }

  if (ingredient.food?.name) {
    parts.push(ingredient.food.name)
  }

  return parts.join(' ').trim()
}

export function extractIngredientKeywords(ingredient: RecipeIngredient): string[] {
  const keywords: string[] = []

  if (ingredient.food?.name) {
    const foodName = ingredient.food.name.trim().toLowerCase()
    keywords.push(foodName)

    // Extract multi-word ingredient keywords (e.g., "all-purpose" from "all-purpose flour")
    const words = foodName.split(/[\s\-]+/)
    if (words.length > 1) {
      // Add the last word (e.g., "flour" from "all-purpose flour")
      keywords.push(words[words.length - 1])
      // Add the first word (e.g., "all" from "all-purpose flour")
      keywords.push(words[0])
    }
  }

  return [...new Set(keywords)].filter((k) => k.length > 0)
}