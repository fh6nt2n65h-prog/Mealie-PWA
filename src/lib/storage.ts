import type { ApiSettings, MealPlanDensity, ViewMode } from '@/types/mealie'

const SETTINGS_KEY = 'mealie-journal.settings.v1'
const VIEW_MODE_KEY = 'mealie-journal.view-mode.v1'
const MEAL_PLAN_DENSITY_KEY = 'mealie-journal.meal-plan-density.v1'
const LEGACY_DEFAULT_BASE_URL = 'http://192.168.1.91:9000'

function getAppOrigin() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  return 'http://192.168.1.91:8088'
}

export const defaultSettings: ApiSettings = {
  baseUrl: getAppOrigin(),
  apiToken: ''
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

export function loadSettings(): ApiSettings {
  const stored = readLocalStorage<ApiSettings>(SETTINGS_KEY, defaultSettings)
  const baseUrl = !stored.baseUrl || stored.baseUrl === LEGACY_DEFAULT_BASE_URL ? getAppOrigin() : stored.baseUrl

  return {
    baseUrl,
    apiToken: stored.apiToken || ''
  }
}

export function saveSettings(settings: ApiSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadViewMode(): ViewMode {
  const stored = readLocalStorage<ViewMode | 'list'>(VIEW_MODE_KEY, 'grid')

  return stored === 'list' ? 'grid' : stored
}

export function saveViewMode(viewMode: ViewMode) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(VIEW_MODE_KEY, JSON.stringify(viewMode))
}

export function loadMealPlanDensity(): MealPlanDensity {
  return 'compact'
}

export function saveMealPlanDensity(_density: MealPlanDensity) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(MEAL_PLAN_DENSITY_KEY, JSON.stringify('compact'))
}

function favoritesKey(settings: ApiSettings) {
  return `mealie-journal.favorites.v1.${settings.baseUrl}`
}

export function loadFavorites(settings: ApiSettings): Set<string> {
  const ids = readLocalStorage<string[]>(favoritesKey(settings), [])
  return new Set(ids)
}

export function saveFavorites(settings: ApiSettings, ids: Set<string>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(favoritesKey(settings), JSON.stringify([...ids]))
}

export function toggleFavorite(settings: ApiSettings, recipeId: string): Set<string> {
  const current = loadFavorites(settings)

  if (current.has(recipeId)) {
    current.delete(recipeId)
  } else {
    current.add(recipeId)
  }

  saveFavorites(settings, current)
  return current
}

// ── Added-to-shopping-list tracking ──────────────────────────────────────────
// Persists which recipe IDs have had their ingredients sent to the shopping
// list, so the Add All button can show "Already Added" on return visits.

function addedRecipesKey(settings: ApiSettings) {
  return `mealie-journal.added-recipes.v1.${settings.baseUrl}`
}

export function loadAddedRecipes(settings: ApiSettings): Set<string> {
  const ids = readLocalStorage<string[]>(addedRecipesKey(settings), [])
  return new Set(ids)
}

export function markRecipeAdded(settings: ApiSettings, recipeId: string) {
  if (typeof window === 'undefined') return
  const current = loadAddedRecipes(settings)
  current.add(recipeId)
  window.localStorage.setItem(addedRecipesKey(settings), JSON.stringify([...current]))
}

export function clearAddedRecipes(settings: ApiSettings) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(addedRecipesKey(settings))
}