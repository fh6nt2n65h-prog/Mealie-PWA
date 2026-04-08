import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Recipe, RecipeSummary, ViewMode } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { EmptyState } from '@/components/empty-state'
import { RecipeCard } from '@/components/recipe-card'
import { RecipeListRow } from '@/components/recipe-list-row'
import { SearchField } from '@/components/search-field'
import { SwipeRecipeDeck } from '@/components/swipe-recipe-deck'
import { loadViewMode, saveViewMode } from '@/lib/storage'
import { MealieApi } from '@/lib/mealie-api'
import { clamp, matchesRecipeQuery } from '@/lib/utils'
import { useStoredState } from '@/hooks/use-stored-state'

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
  const [error, setError] = useState('')
  const [scanningIngredients, setScanningIngredients] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [viewMode] = useStoredState<ViewMode>(loadViewMode, saveViewMode)
  const [swipeIndex, setSwipeIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      if (!settings.apiToken) {
        setRecipes([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')
      setScanningIngredients(false)

      try {
        const api = new MealieApi(settings)
        const response = await api.getRecipes()

        if (cancelled) {
          return
        }

        setScanningIngredients(true)
        const detailedRecipes = await hydrateRecipes(api, response.items)

        if (!cancelled) {
          setRecipes(detailedRecipes)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load recipes right now.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setScanningIngredients(false)
        }
      }
    }

    loadRecipes()

    return () => {
      cancelled = true
    }
  }, [settings])

  useEffect(() => {
    setSwipeIndex(0)
  }, [searchValue, viewMode])

  const filteredRecipes = recipes.filter((recipe) => matchesRecipeQuery(recipe, searchValue))
  const currentSwipeIndex = clamp(swipeIndex, 0, Math.max(filteredRecipes.length - 1, 0))

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
    <div className="space-y-5 animate-rise">
      <section className="space-y-3 rounded-card border border-taupe/70 bg-parchment px-5 py-5 shadow-paper sm:px-6">
        <SearchField value={searchValue} onChange={setSearchValue} placeholder="Search names and ingredients" />

        <div className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">
          <span>{filteredRecipes.length} recipes visible</span>
          {scanningIngredients && <span>Refreshing ingredient text…</span>}
        </div>
      </section>

      {loading && <EmptyState title="Fetching recipes" description="Pulling your library from Mealie and building the ingredient search index." />}

      {!loading && error && <EmptyState title="Unable to load recipes" description={error} />}

      {!loading && !error && filteredRecipes.length === 0 && (
        <EmptyState
          title="No matches found"
          description="Try a broader search term or return to Settings if you recently changed servers or tokens."
        />
      )}

      {!loading && !error && filteredRecipes.length > 0 && viewMode === 'grid' && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} baseUrl={settings.baseUrl} onClick={() => navigate(`/recipes/${recipe.slug}`)} />
          ))}
        </section>
      )}

      {!loading && !error && filteredRecipes.length > 0 && viewMode === 'list' && (
        <section className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <RecipeListRow key={recipe.slug} recipe={recipe} baseUrl={settings.baseUrl} onClick={() => navigate(`/recipes/${recipe.slug}`)} />
          ))}
        </section>
      )}

      {!loading && !error && filteredRecipes.length > 0 && viewMode === 'swipe' && (
        <SwipeRecipeDeck
          recipes={filteredRecipes}
          currentIndex={currentSwipeIndex}
          onChangeIndex={setSwipeIndex}
          baseUrl={settings.baseUrl}
          onSelect={(slug) => navigate(`/recipes/${slug}`)}
        />
      )}
    </div>
  )
}