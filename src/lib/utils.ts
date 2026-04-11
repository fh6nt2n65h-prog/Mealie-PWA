import dayjs from 'dayjs'
import type { Recipe, RecipeSummary, ShoppingListItem, RecipeIngredient } from '@/types/mealie'

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

export function buildApiBaseUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/api`
}

function getRecipeImageVersion(recipe: Recipe | RecipeSummary) {
  if (typeof recipe.clientImageVersion === 'string' && recipe.clientImageVersion) {
    return recipe.clientImageVersion
  }

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

function getShoppingItemExportText(item: ShoppingListItem) {
  const label = item.food?.name || item.display || 'Untitled item'

  return [
    item.quantity != null ? item.quantity : null,
    item.unit?.abbreviation || item.unit?.name || null,
    label
  ]
    .filter((v) => v !== null && v !== undefined && v !== '')
    .join(' ')
}

export function buildRemindersShortcutUrl(items: ShoppingListItem[], returnUrl?: string) {
  const payload = items
    .map((item) => getShoppingItemExportText(item))
    .join('\n')

  // URLSearchParams encodes spaces as '+', but iOS Shortcuts may treat '+' literally.
  // Use encodeURIComponent to force '%20' so shortcut names and text parse correctly.
  const name = encodeURIComponent('Add to Reminders')
  const text = encodeURIComponent(payload)
  const success = returnUrl ? `&x-success=${encodeURIComponent(returnUrl)}` : ''
  const base = returnUrl ? 'shortcuts://x-callback-url/run-shortcut' : 'shortcuts://run-shortcut'

  return `${base}?name=${name}&input=text&text=${text}${success}`
}

const IGNORED_INGREDIENT_KEYWORDS = new Set([
  'and', 'the', 'with', 'from', 'into', 'until', 'fresh', 'large', 'small', 'medium', 'about', 'roughly', 'more', 'less',
  'taste', 'plus', 'optional', 'divided', 'needed', 'recipe', 'ingredient', 'ingredients'
])

function normalizeIngredientKeywordSource(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addIngredientKeywords(target: Set<string>, value?: string | null) {
  if (!value) {
    return
  }

  const normalized = normalizeIngredientKeywordSource(value)

  if (!normalized) {
    return
  }

  const words = normalized
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 && !/^\d+$/.test(word) && !IGNORED_INGREDIENT_KEYWORDS.has(word))

  if (words.length === 0) {
    return
  }

  if (words.length <= 4) {
    target.add(words.join(' '))
  }

  if (words.length >= 2) {
    target.add(words.slice(-2).join(' '))
  }

  words.forEach((word) => {
    target.add(word)
  })
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

  const label = ingredient.food?.name || ingredient.display || ingredient.note || ingredient.title || ingredient.originalText

  if (label) {
    parts.push(label)
  }

  return parts.join(' ').trim()
}

export function extractIngredientKeywords(ingredient: RecipeIngredient): string[] {
  const keywords = new Set<string>()

  addIngredientKeywords(keywords, ingredient.food?.name)
  addIngredientKeywords(keywords, ingredient.note)
  addIngredientKeywords(keywords, ingredient.display)
  addIngredientKeywords(keywords, ingredient.title)
  addIngredientKeywords(keywords, ingredient.originalText)

  return Array.from(keywords)
}