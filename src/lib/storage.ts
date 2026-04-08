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