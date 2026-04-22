import type {
  ApiErrorPayload,
  ApiSettings,
  CreateMealPlanEntryInput,
  CreateRecipeInput,
  IngredientFood,
  IngredientUnit,
  MealPlanEntry,
  Pagination,
  Recipe,
  RecipeCategory,
  RecipeSummary,
  ShoppingList,
  ShoppingListItem,
  ShoppingListSummary,
  UpdateMealPlanEntryInput,
  UserProfile,
  UserRatings,
} from '@/types/mealie'
import { buildApiBaseUrl } from '@/lib/utils'

export type ModeCategories = {
  savoury: RecipeCategory
  sweet: RecipeCategory
}

const MODE_CATEGORIES_CACHE_KEY = 'mealie.mode-categories.v1'

export async function ensureModeCategories(api: MealieApi): Promise<ModeCategories> {
  const cached = sessionStorage.getItem(MODE_CATEGORIES_CACHE_KEY)

  if (cached) {
    try {
      return JSON.parse(cached) as ModeCategories
    } catch {
      // ignore invalid cache
    }
  }

  const response = await api.getCategories()
  let savoury: RecipeCategory | null = response.items.find((c) => c.slug === 'savoury') ?? null
  let sweet: RecipeCategory | null = response.items.find((c) => c.slug === 'sweet') ?? null

  if (!savoury) {
    savoury = await api.createCategory('Savoury', 'savoury')
  }

  if (!sweet) {
    sweet = await api.createCategory('Sweet', 'sweet')
  }

  const result: ModeCategories = { savoury, sweet }
  sessionStorage.setItem(MODE_CATEGORIES_CACHE_KEY, JSON.stringify(result))
  return result
}

export class MealieApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'MealieApiError'
    this.status = status
  }
}

export class MealieApi {
  private settings: ApiSettings
  private static readonly REQUEST_TIMEOUT_MS = 30000
  private static readonly MAX_CONCURRENT_REQUESTS = 3
  private static readonly MIN_REQUEST_SPACING_MS = 200
  private static activeRequestCount = 0
  private static queue: Array<() => void> = []
  private static nextRequestAllowedAt = 0
  private static queueTimer: ReturnType<typeof setTimeout> | null = null
  private static inflightGetRequests = new Map<string, Promise<unknown>>()

  constructor(settings: ApiSettings) {
    this.settings = settings
  }

  updateSettings(settings: ApiSettings) {
    this.settings = settings
  }

  private get baseUrl() {
    return buildApiBaseUrl(this.settings.baseUrl)
  }

  private static runWithQueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        MealieApi.activeRequestCount += 1
        MealieApi.nextRequestAllowedAt = Date.now() + MealieApi.MIN_REQUEST_SPACING_MS

        operation()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            MealieApi.activeRequestCount = Math.max(0, MealieApi.activeRequestCount - 1)
            MealieApi.drainQueue()
          })
      }

      MealieApi.queue.push(run)
      MealieApi.drainQueue()
    })
  }

  private static drainQueue() {
    if (MealieApi.activeRequestCount >= MealieApi.MAX_CONCURRENT_REQUESTS) {
      return
    }

    if (MealieApi.queue.length === 0) {
      return
    }

    const waitMs = MealieApi.nextRequestAllowedAt - Date.now()

    if (waitMs > 0) {
      if (MealieApi.queueTimer === null) {
        MealieApi.queueTimer = setTimeout(() => {
          MealieApi.queueTimer = null
          MealieApi.drainQueue()
        }, waitMs)
      }

      return
    }

    const next = MealieApi.queue.shift()

    if (!next) {
      return
    }

    next()
    MealieApi.drainQueue()
  }

  private async performRequest<T>(requestUrl: string, headers: Headers, init?: RequestInit): Promise<T> {
    let response: Response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MealieApi.REQUEST_TIMEOUT_MS)

    try {
      response = await fetch(requestUrl, {
        ...init,
        headers,
        signal: controller.signal
      })
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        throw new MealieApiError('The request timed out. Mealie might be busy or unreachable. Please try again.', 0)
      }

      throw new MealieApiError(
        'The browser could not reach your Mealie instance. If this is a local HTTP server, make sure the app is also opened over HTTP and that the Pi is reachable on your network. If the app is installed as an iPhone PWA, Mealie needs HTTPS.',
        0
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`

      try {
        const text = await response.text()
        if (text) {
          try {
            const payload = JSON.parse(text) as ApiErrorPayload

            if (typeof payload.detail === 'string') {
              message = payload.detail
            }

            if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
              message = payload.detail[0].msg
            }
          } catch {
            message = text
          }
        }
      } catch {
        // Unable to parse error response
      }

      throw new MealieApiError(message, response.status)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set('Accept', 'application/json')

    if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (this.settings.apiToken) {
      headers.set('Authorization', `Bearer ${this.settings.apiToken}`)
    }

    const requestUrl = `${this.baseUrl}${path}`
    const method = (init?.method || 'GET').toUpperCase()

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && requestUrl.startsWith('http:')) {
      throw new MealieApiError(
        'Your PWA is running on HTTPS, but the Mealie API is HTTP. Browsers block that request. Put Mealie behind HTTPS or open the app over HTTP for local testing.',
        0
      )
    }

    const shouldDedupe = method === 'GET' && !init?.body
    const dedupeKey = shouldDedupe ? `${requestUrl}::${this.settings.apiToken || ''}` : null

    if (dedupeKey) {
      const inflight = MealieApi.inflightGetRequests.get(dedupeKey)

      if (inflight) {
        return inflight as Promise<T>
      }
    }

    const pendingRequest = MealieApi.runWithQueue(() => this.performRequest<T>(requestUrl, headers, init))

    if (dedupeKey) {
      MealieApi.inflightGetRequests.set(dedupeKey, pendingRequest)
      pendingRequest.finally(() => {
        MealieApi.inflightGetRequests.delete(dedupeKey)
      })
    }

    return pendingRequest
  }

  async getCurrentUser() {
    return this.request<UserProfile>('/users/self')
  }

  async getRecipes() {
    return this.request<Pagination<RecipeSummary>>('/recipes?perPage=200&orderDirection=desc')
  }

  async getRecipe(slug: string) {
    return this.request<Recipe>(`/recipes/${encodeURIComponent(slug)}`)
  }

  async getIngredientUnits(search: string) {
    const params = new URLSearchParams({
      search,
      perPage: '25'
    })

    return this.request<Pagination<IngredientUnit>>(`/units?${params.toString()}`)
  }

  async createIngredientUnit(payload: Pick<IngredientUnit, 'name' | 'abbreviation'>) {
    return this.request<IngredientUnit>('/units', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async getIngredientFoods(search: string) {
    const params = new URLSearchParams({
      search,
      perPage: '25'
    })

    return this.request<Pagination<IngredientFood>>(`/foods?${params.toString()}`)
  }

  async createIngredientFood(payload: Pick<IngredientFood, 'name'>) {
    return this.request<IngredientFood>('/foods', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async createRecipe(payload: CreateRecipeInput) {
    return this.request<string>('/recipes', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async createRecipeFromUrl(url: string) {
    return this.request<string>('/recipes/create/url', {
      method: 'POST',
      body: JSON.stringify({
        url,
        includeTags: false,
        includeCategories: false
      })
    })
  }

  async createRecipeFromImages(images: File[]) {
    const formData = new FormData()

    images.forEach((image) => {
      formData.append('images', image)
    })

    return this.request<string>('/recipes/create/image', {
      method: 'POST',
      body: formData
    })
  }

  async deleteRecipe(slug: string) {
    return this.request<Recipe>(`/recipes/${encodeURIComponent(slug)}`, {
      method: 'DELETE'
    })
  }

  async getMealPlan(startDate: string, endDate: string) {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      perPage: '200'
    })

    return this.request<Pagination<MealPlanEntry>>(`/households/mealplans?${params.toString()}`)
  }

  async createMealPlanEntry(payload: CreateMealPlanEntryInput) {
    return this.request<MealPlanEntry>('/households/mealplans', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async updateMealPlanEntry(itemId: number, payload: UpdateMealPlanEntryInput) {
    return this.request<MealPlanEntry>(`/households/mealplans/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

  async deleteMealPlanEntry(itemId: number) {
    return this.request<MealPlanEntry>(`/households/mealplans/${itemId}`, {
      method: 'DELETE'
    })
  }

  async getShoppingLists() {
    return this.request<Pagination<ShoppingListSummary>>('/households/shopping/lists?perPage=100&orderDirection=desc')
  }

  async getShoppingList(listId: string) {
    return this.request<ShoppingList>(`/households/shopping/lists/${listId}`)
  }

  async deleteShoppingItem(itemId: string) {
    return this.request<void>(`/households/shopping/items/${itemId}`, {
      method: 'DELETE'
    })
  }

  async updateShoppingItem(itemId: string, item: ShoppingListItem) {
    return this.request(`/households/shopping/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: item.id,
        shoppingListId: item.shoppingListId,
        checked: item.checked,
        quantity: item.quantity,
        note: item.note,
        display: item.display,
        foodId: item.foodId || item.food?.id || null,
        labelId: item.labelId || item.label?.id || null,
        unitId: item.unitId || item.unit?.id || null,
        position: item.position || 0,
        recipeReferences: item.recipeReferences || []
      })
    })
  }

  async createShoppingList(name: string) {
    return this.request<{ id: string; name: string }>('/households/shopping/lists', {
      method: 'POST',
      body: JSON.stringify({ name })
    })
  }

  async updateRecipe(slug: string, payload: Recipe) {
    return this.request<Recipe>(`/recipes/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

  async uploadRecipeImage(recipeId: string, file: File, extension: string) {
    if (!recipeId) {
      throw new Error('Recipe ID is required to upload an image')
    }
    
    const formData = new FormData()
    formData.append('image', file)
    formData.append('extension', extension)
    
    const headers = new Headers()
    if (this.settings.apiToken) {
      headers.set('Authorization', `Bearer ${this.settings.apiToken}`)
    }
    
    const requestUrl = `${this.baseUrl}/recipes/${recipeId}/image`
    
    try {
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers,
        body: formData
      })
      
      // Mealie sometimes returns 500 for image upload but the image actually gets saved
      // Only throw on actual network errors or 4xx errors (except 500)
      if (!response.ok && response.status !== 500) {
        let message = `Image upload failed with status ${response.status}`
        try {
          const text = await response.text()
          if (text) {
            try {
              const payload = JSON.parse(text) as { detail?: string }
              if (typeof payload.detail === 'string') {
                message = payload.detail
              }
            } catch {
              message = text
            }
          }
        } catch {
          // Unable to parse error
        }
        throw new MealieApiError(message, response.status)
      }
    } catch (fetchError) {
      if (fetchError instanceof MealieApiError) {
        throw fetchError
      }
      throw new MealieApiError(
        'Failed to upload image. Check that your Mealie instance is reachable.',
        0
      )
    }
  }

  async addRecipeToShoppingList(listId: string, recipeId: string) {
    return this.request(`/households/shopping/lists/${listId}/recipe/${recipeId}`, {
      method: 'POST'
    })
  }

  async getUserFavorites(userId: string) {
    return this.request<UserRatings>(`/users/${encodeURIComponent(userId)}/favorites`)
  }

  async addFavorite(userId: string, slug: string) {
    return this.request<void>(`/users/${encodeURIComponent(userId)}/favorites/${encodeURIComponent(slug)}`, {
      method: 'POST'
    })
  }

  async removeFavorite(userId: string, slug: string) {
    return this.request<void>(`/users/${encodeURIComponent(userId)}/favorites/${encodeURIComponent(slug)}`, {
      method: 'DELETE'
    })
  }

  async getCategories() {
    return this.request<Pagination<RecipeCategory>>('/organizers/categories?perPage=100')
  }

  async createCategory(name: string, slug: string) {
    return this.request<RecipeCategory>('/organizers/categories', {
      method: 'POST',
      body: JSON.stringify({ name, slug })
    })
  }

}