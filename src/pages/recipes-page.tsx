import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChefHat, Plus, RefreshCw } from 'lucide-react'
import type { Recipe, RecipeSummary, ViewMode } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { DialogSheet } from '@/components/dialog-sheet'
import { EmptyState } from '@/components/empty-state'
import { RecipeCard } from '@/components/recipe-card'
import { RecipeListRow } from '@/components/recipe-list-row'
import { SearchField } from '@/components/search-field'
import { SwipeRecipeDeck } from '@/components/swipe-recipe-deck'
import { useStoredState } from '@/hooks/use-stored-state'
import { getRecipeCache, hasLoadedRecipesThisSession, markRecipesLoadedThisSession, setRecipeCache, upsertRecipeCacheEntry } from '@/lib/recipe-cache'
import { MealieApi } from '@/lib/mealie-api'
import { loadViewMode, saveViewMode } from '@/lib/storage'
import { clamp, matchesRecipeQuery } from '@/lib/utils'

async function hydrateRecipes(api: MealieApi, summaries: RecipeSummary[]) {
  const hydrated: Recipe[] = []

  for (let index = 0; index < summaries.length; index += 12) {
    const batch = summaries.slice(index, index + 12)
    const results = await Promise.allSettled(batch.map((recipe) => api.getRecipe(recipe.slug)))

    results.forEach((result, resultIndex) => {
      if (result.status === 'fulfilled') {
        hydrated.push(result.value)
      } else {
        const fallback = batch[resultIndex]
        hydrated.push({
          ...fallback,
          recipeIngredient: [],
          recipeInstructions: []
        })
      }
    })
  }

  return hydrated
}

export function RecipesPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [scanningIngredients, setScanningIngredients] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode] = useStoredState<ViewMode>(loadViewMode, saveViewMode)
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [lastUpdated, setLastUpdated] = useState('')
  const [pullDistance, setPullDistance] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newRecipeName, setNewRecipeName] = useState('')
  const [creatingRecipe, setCreatingRecipe] = useState(false)
  const [createError, setCreateError] = useState('')
  const requestIdRef = useRef(0)
  const touchStartRef = useRef<number | null>(null)

  async function refreshRecipes(options?: { background?: boolean }) {
    if (!settings.apiToken) {
      setRecipes([])
      setLoading(false)
      setRefreshing(false)
      setError('')
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (options?.background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')
    setScanningIngredients(false)

    try {
      const api = new MealieApi(settings)
      const response = await api.getRecipes()

      if (requestIdRef.current !== requestId) {
        return
      }

      setScanningIngredients(true)
      const detailedRecipes = await hydrateRecipes(api, response.items)

      if (requestIdRef.current !== requestId) {
        return
      }

      const cacheEntry = setRecipeCache(settings, detailedRecipes)
      markRecipesLoadedThisSession(settings)
      setRecipes(detailedRecipes)
      setLastUpdated(cacheEntry.updatedAt)
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load recipes right now.')
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
        setRefreshing(false)
        setScanningIngredients(false)
      }
    }
  }

  useEffect(() => {
    if (!settings.apiToken) {
      setRecipes([])
      setLoading(false)
      setRefreshing(false)
      setError('')
      return
    }

    const cacheEntry = getRecipeCache(settings)

    if (cacheEntry) {
      setRecipes(cacheEntry.recipes)
      setLastUpdated(cacheEntry.updatedAt)
      setLoading(false)
    }

    if (!hasLoadedRecipesThisSession(settings)) {
      void refreshRecipes({ background: Boolean(cacheEntry) })
    }
  }, [settings.apiToken, settings.baseUrl])

  useEffect(() => {
    setSwipeIndex(0)
  }, [searchValue, viewMode])

  const filteredRecipes = recipes.filter((recipe) => matchesRecipeQuery(recipe, searchValue))
  const currentSwipeIndex = clamp(swipeIndex, 0, Math.max(filteredRecipes.length - 1, 0))

  function getScrollRoot() {
    if (typeof document === 'undefined') {
      return null
    }

    return document.getElementById('app-scroll-root')
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const scrollRoot = getScrollRoot()

    if (scrollRoot && scrollRoot.scrollTop <= 0 && !refreshing) {
      touchStartRef.current = event.touches[0]?.clientY || null
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartRef.current === null) {
      return
    }

    const scrollRoot = getScrollRoot()

    if (scrollRoot && scrollRoot.scrollTop > 0) {
      setPullDistance(0)
      return
    }

    const delta = (event.touches[0]?.clientY || 0) - touchStartRef.current

    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.45, 96))
    }
  }

  function handleTouchEnd() {
    const shouldRefresh = pullDistance >= 56
    touchStartRef.current = null
    setPullDistance(0)

    if (shouldRefresh) {
      void refreshRecipes({ background: true })
    }
  }

  async function handleCreateRecipe() {
    const trimmedName = newRecipeName.trim()

    if (!trimmedName || creatingRecipe) {
      return
    }

    setCreatingRecipe(true)
    setCreateError('')

    try {
      const api = new MealieApi(settings)
      const slug = await api.createRecipe({ name: trimmedName })
      const detail = await api.getRecipe(slug)
      const cacheEntry = upsertRecipeCacheEntry(settings, detail)

      setRecipes(cacheEntry.recipes)
      setLastUpdated(cacheEntry.updatedAt)
      setShowCreateDialog(false)
      setNewRecipeName('')
      navigate(`/recipes/${detail.slug}`)
    } catch (createRecipeError) {
      setCreateError(createRecipeError instanceof Error ? createRecipeError.message : 'Unable to create that recipe.')
    } finally {
      setCreatingRecipe(false)
    }
  }

  if (!settings.apiToken) {
    return (
      <div className="space-y-4 animate-rise">
        <EmptyState
          title="Start with Settings"
          description="Add your Mealie base URL and API token before this journal can pull recipes, meal plans, and shopping data."
        />
        <Link to="/settings" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-parchment">
          Open settings
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5 animate-rise" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="pointer-events-none flex justify-center overflow-hidden" aria-hidden="true">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-oat/90 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-oliveGray shadow-paper transition-transform duration-200"
            style={{ transform: `translateY(${pullDistance ? 0 : -56}px)` }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Pull to refresh'}
          </div>
        </div>

        <section className="space-y-4 rounded-card border border-taupe/70 bg-parchment px-5 py-5 shadow-paper sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchField value={searchValue} onChange={setSearchValue} placeholder="Search names and ingredients" />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void refreshRecipes({ background: true })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-taupe bg-cream px-4 py-3 text-sm font-semibold text-ink"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-4 py-3 text-sm font-semibold text-parchment"
              >
                <Plus className="h-4 w-4" />
                New recipe
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">
            <span>{filteredRecipes.length} recipes visible</span>
            <div className="flex items-center gap-3">
              {scanningIngredients && <span>Refreshing ingredient text…</span>}
              {lastUpdated && <span>Cached {new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
            </div>
          </div>
        </section>

        {loading && recipes.length === 0 && <EmptyState title="Fetching recipes" description="Pulling your library from Mealie and building the ingredient search index." />}

        {!loading && error && <EmptyState title="Unable to load recipes" description={error} />}

        {!loading && !error && filteredRecipes.length === 0 && (
          <EmptyState
            title="No matches found"
            description="Try a broader search term or return to Settings if you recently changed servers or tokens."
          />
        )}

        {!error && filteredRecipes.length > 0 && viewMode === 'grid' && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.slug} recipe={recipe} baseUrl={settings.baseUrl} onClick={() => navigate(`/recipes/${recipe.slug}`)} />
            ))}
          </section>
        )}

        {!error && filteredRecipes.length > 0 && viewMode === 'list' && (
          <section className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <RecipeListRow key={recipe.slug} recipe={recipe} baseUrl={settings.baseUrl} onClick={() => navigate(`/recipes/${recipe.slug}`)} />
            ))}
          </section>
        )}

        {!error && filteredRecipes.length > 0 && viewMode === 'swipe' && (
          <SwipeRecipeDeck
            recipes={filteredRecipes}
            currentIndex={currentSwipeIndex}
            onChangeIndex={setSwipeIndex}
            baseUrl={settings.baseUrl}
            onSelect={(slug) => navigate(`/recipes/${slug}`)}
          />
        )}
      </div>

      <DialogSheet
        open={showCreateDialog}
        title="New recipe"
        description="Create a blank recipe directly in Mealie."
        onClose={() => {
          if (!creatingRecipe) {
            setShowCreateDialog(false)
            setCreateError('')
          }
        }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateDialog(false)}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateRecipe()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment"
            >
              <ChefHat className="h-4 w-4" />
              {creatingRecipe ? 'Creating…' : 'Create recipe'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Recipe name</span>
            <input
              value={newRecipeName}
              onChange={(event) => setNewRecipeName(event.target.value)}
              placeholder="Weeknight pasta"
              className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </label>

          {createError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{createError}</p>}
        </div>
      </DialogSheet>
    </>
  )
}