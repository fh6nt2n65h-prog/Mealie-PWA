import type { ApiSettings, Recipe } from '@/types/mealie'
import { normalizeBaseUrl } from '@/lib/utils'

const RECIPE_CACHE_KEY = 'mealie-journal.recipe-cache.v1'
export const RECIPE_CACHE_UPDATED_EVENT = 'mealie-journal:recipe-cache-updated'

type RecipeCacheEntry = {
  recipes: Recipe[]
  updatedAt: string
}

type RecipeCacheStore = Record<string, RecipeCacheEntry>

const sessionLoadedKeys = new Set<string>()
const memoryCache = new Map<string, RecipeCacheEntry>()

function getCacheKey(settings: ApiSettings) {
  return `${normalizeBaseUrl(settings.baseUrl)}::${settings.apiToken.slice(0, 12)}`
}

function dispatchRecipeCacheUpdated(settings: ApiSettings, updatedAt: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(RECIPE_CACHE_UPDATED_EVENT, {
    detail: {
      key: getCacheKey(settings),
      updatedAt,
    },
  }))
}

function loadStore(): RecipeCacheStore {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.localStorage.getItem(RECIPE_CACHE_KEY)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as RecipeCacheStore
  } catch {
    return {}
  }
}

function saveStore(store: RecipeCacheStore) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(RECIPE_CACHE_KEY, JSON.stringify(store))
}

export function getRecipeCache(settings: ApiSettings) {
  const key = getCacheKey(settings)

  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null
  }

  const entry = loadStore()[key] || null

  if (entry) {
    memoryCache.set(key, entry)
  }

  return entry
}

export function setRecipeCache(settings: ApiSettings, recipes: Recipe[]) {
  const key = getCacheKey(settings)
  const entry = {
    recipes,
    updatedAt: new Date().toISOString()
  }

  memoryCache.set(key, entry)

  const store = loadStore()
  store[key] = entry
  saveStore(store)
  dispatchRecipeCacheUpdated(settings, entry.updatedAt)

  return entry
}

export function upsertRecipeCacheEntry(settings: ApiSettings, recipe: Recipe) {
  const existing = getRecipeCache(settings)
  const recipes = existing?.recipes || []
  const nextRecipes = [recipe, ...recipes.filter((candidate) => candidate.slug !== recipe.slug)]

  return setRecipeCache(settings, nextRecipes)
}

export function removeRecipeCacheEntry(settings: ApiSettings, slug: string) {
  const existing = getRecipeCache(settings)

  if (!existing) {
    return null
  }

  return setRecipeCache(
    settings,
    existing.recipes.filter((recipe) => recipe.slug !== slug)
  )
}

export function hasLoadedRecipesThisSession(settings: ApiSettings) {
  return sessionLoadedKeys.has(getCacheKey(settings))
}

export function markRecipesLoadedThisSession(settings: ApiSettings) {
  sessionLoadedKeys.add(getCacheKey(settings))
}

export function invalidateRecipesLoadedThisSession(settings: ApiSettings) {
  sessionLoadedKeys.delete(getCacheKey(settings))
}