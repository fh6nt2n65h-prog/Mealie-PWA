import dayjs from 'dayjs'
import type { Recipe, RecipeSummary, ShoppingListItem } from '@/types/mealie'

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

export function buildApiBaseUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/api`
}

export function getRecipeImageUrl(baseUrl: string, recipe: Recipe | RecipeSummary) {
  if (typeof recipe.image === 'string' && recipe.image.length > 0) {
    if (recipe.image.startsWith('http')) {
      return recipe.image
    }

    return `${normalizeBaseUrl(baseUrl)}${recipe.image.startsWith('/') ? recipe.image : `/${recipe.image}`}`
  }

  if (!recipe.id) {
    return null
  }

  return `${buildApiBaseUrl(baseUrl)}/media/recipes/${recipe.id}/images/original.webp`
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