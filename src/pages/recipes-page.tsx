import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { flushSync } from 'react-dom'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarPlus, Camera, Heart, ImagePlus, Link as LinkIcon, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import type { PlanEntryType, Recipe, RecipeSummary, ViewMode } from '@/types/mealie'
import { useHeaderSlots } from '@/app/header-slots-context'
import { useSettings } from '@/app/settings-context'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DialogSheet } from '@/components/dialog-sheet'
import { EmptyState } from '@/components/empty-state'
import { RecipeCard } from '@/components/recipe-card'
import { SwipeRecipeDeck } from '@/components/swipe-recipe-deck'
import { useStoredState } from '@/hooks/use-stored-state'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { getRecipeCache, hasLoadedRecipesThisSession, markRecipesLoadedThisSession, removeRecipeCacheEntry, setRecipeCache, upsertRecipeCacheEntry } from '@/lib/recipe-cache'
import { MealieApi } from '@/lib/mealie-api'
import { loadFavorites, loadViewMode, saveViewMode, toggleFavorite } from '@/lib/storage'
import { clamp, formatDayLabel, matchesRecipeQuery } from '@/lib/utils'

function buildCalendarDays() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = dayjs().add(index, 'day')

    return {
      key: date.format('YYYY-MM-DD'),
      label: formatDayLabel(date.format('YYYY-MM-DD'))
    }
  })
}

const MEAL_PLAN_DAYS = buildCalendarDays()
const QUICK_MEAL_TYPES: PlanEntryType[] = ['breakfast', 'lunch', 'dinner']

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
  const [searchValue, setSearchValue] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [storedViewMode] = useStoredState<ViewMode>(loadViewMode, saveViewMode)
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createMode, setCreateMode] = useState<'menu' | 'url' | 'image'>('menu')
  const [recipeUrl, setRecipeUrl] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [creatingRecipe, setCreatingRecipe] = useState(false)
  const [createError, setCreateError] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeActionMode, setRecipeActionMode] = useState<'menu' | 'mealplan'>('menu')
  const [mealPlanDate, setMealPlanDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mealPlanType, setMealPlanType] = useState<PlanEntryType>('dinner')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => loadFavorites(settings))
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const requestIdRef = useRef(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
    onRefresh: () => refreshRecipes({ background: true })
  })

  function revokePreviewUrls(urls: string[]) {
    urls.forEach((url) => {
      URL.revokeObjectURL(url)
    })
  }

  function resetCreateDialog() {
    revokePreviewUrls(imagePreviewUrls)
    setShowCreateDialog(false)
    setCreateMode('menu')
    setRecipeUrl('')
    setSelectedImages([])
    setImagePreviewUrls([])
    setCreateError('')
    setCreatingRecipe(false)
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  useEffect(() => {
    return () => {
      revokePreviewUrls(imagePreviewUrls)
    }
  }, [imagePreviewUrls])

  async function refreshRecipes(options?: { background?: boolean }) {
    if (!settings.apiToken) {
      setRecipes([])
      setLoading(false)
      setError('')
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!options?.background) {
      setLoading(true)
    }

    setError('')

    try {
      const api = new MealieApi(settings)
      const response = await api.getRecipes()

      if (requestIdRef.current !== requestId) {
        return
      }

      const detailedRecipes = await hydrateRecipes(api, response.items)

      if (requestIdRef.current !== requestId) {
        return
      }

      setRecipeCache(settings, detailedRecipes)
      markRecipesLoadedThisSession(settings)
      setRecipes(detailedRecipes)
    } catch (loadError) {
      if (requestIdRef.current === requestId) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load recipes right now.')
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!settings.apiToken) {
      setRecipes([])
      setLoading(false)
      setError('')
      return
    }

    const cacheEntry = getRecipeCache(settings)

    if (cacheEntry) {
      setRecipes(cacheEntry.recipes)
      setLoading(false)
    }

    if (!hasLoadedRecipesThisSession(settings)) {
      void refreshRecipes({ background: Boolean(cacheEntry) })
    }
  }, [settings.apiToken, settings.baseUrl])

  const viewMode = storedViewMode === 'grid' ? 'grid' : 'swipe'
  const filteredRecipes = recipes.filter(
    (recipe) => matchesRecipeQuery(recipe, searchValue) && (!showFavoritesOnly || (recipe.id != null && favoriteIds.has(recipe.id)))
  )
  const currentSwipeIndex = clamp(swipeIndex, 0, Math.max(filteredRecipes.length - 1, 0))
  const mealPlanDays = useMemo(() => MEAL_PLAN_DAYS, [])

  useEffect(() => {
    setSwipeIndex(0)
  }, [searchValue, viewMode])

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    const focusSearchInput = () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    const animationFrame = requestAnimationFrame(focusSearchInput)
    const timeoutId = window.setTimeout(focusSearchInput, 60)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(timeoutId)
    }
  }, [isSearchOpen])

  async function handleImportedRecipe(slug: string) {
    const api = new MealieApi(settings)
    const detail = await api.getRecipe(slug)
    const cacheEntry = upsertRecipeCacheEntry(settings, detail)

    setRecipes(cacheEntry.recipes)
    resetCreateDialog()
    navigate(`/recipes/${detail.slug}`)
  }

  async function handleCreateFromUrl() {
    const trimmedUrl = recipeUrl.trim()

    if (!trimmedUrl || creatingRecipe) {
      return
    }

    setCreatingRecipe(true)
    setCreateError('')

    try {
      const api = new MealieApi(settings)
      const slug = await api.createRecipeFromUrl(trimmedUrl)
      await handleImportedRecipe(slug)
    } catch (createRecipeError) {
      setCreateError(createRecipeError instanceof Error ? createRecipeError.message : 'Unable to import that recipe URL.')
      setCreatingRecipe(false)
    }
  }

  async function handleCreateFromImages() {
    if (selectedImages.length === 0 || creatingRecipe) {
      return
    }

    setCreatingRecipe(true)
    setCreateError('')

    try {
      const api = new MealieApi(settings)
      const slug = await api.createRecipeFromImages(selectedImages)
      await handleImportedRecipe(slug)
    } catch (createRecipeError) {
      setCreateError(createRecipeError instanceof Error ? createRecipeError.message : 'Unable to create a recipe from those images.')
      setCreatingRecipe(false)
    }
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : []

    revokePreviewUrls(imagePreviewUrls)
    setSelectedImages(files)
    setImagePreviewUrls(files.map((file) => URL.createObjectURL(file)))
  }

  function openRecipeActions(recipe: Recipe) {
    setSelectedRecipe(recipe)
    setRecipeActionMode('menu')
    setMealPlanDate(new Date().toISOString().slice(0, 10))
    setMealPlanType('dinner')
    setActionBusy(false)
    setActionError('')
  }

  function closeRecipeActions(force = false) {
    if (actionBusy && !force) {
      return
    }

    setSelectedRecipe(null)
    setRecipeActionMode('menu')
    setActionBusy(false)
    setActionError('')
    setConfirmDeleteOpen(false)
  }

  async function handleDeleteFromActions() {
    if (!selectedRecipe || actionBusy) {
      return
    }

    setActionBusy(true)
    setActionError('')

    try {
      const api = new MealieApi(settings)
      await api.deleteRecipe(selectedRecipe.slug)
      const cacheEntry = removeRecipeCacheEntry(settings, selectedRecipe.slug)

      if (cacheEntry) {
        setRecipes(cacheEntry.recipes)
      }

      closeRecipeActions(true)
    } catch (deleteRecipeError) {
      setActionError(deleteRecipeError instanceof Error ? deleteRecipeError.message : 'Unable to delete that recipe.')
      setActionBusy(false)
    }
  }

  async function handleAddRecipeToMealPlan() {
    if (!selectedRecipe?.id || actionBusy) {
      return
    }

    setActionBusy(true)
    setActionError('')

    try {
      const api = new MealieApi(settings)
      await api.createMealPlanEntry({
        date: mealPlanDate,
        entryType: mealPlanType,
        recipeId: selectedRecipe.id,
        title: '',
        text: ''
      })
      closeRecipeActions(true)
    } catch (createMealPlanError) {
      setActionError(createMealPlanError instanceof Error ? createMealPlanError.message : 'Unable to add that recipe to the meal plan.')
      setActionBusy(false)
    }
  }

  function openSearch() {
    flushSync(() => setIsSearchOpen(true))
    searchInputRef.current?.focus()
  }

  useHeaderSlots({
    sideContent: settings.apiToken ? (
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <div
          className={`flex min-w-0 items-center overflow-hidden rounded-full border border-taupe/70 bg-parchment shadow-paper transition-[width,padding] duration-200 ease-out ${isSearchOpen ? 'w-[min(52vw,11.5rem)] max-w-[11.5rem] px-2 py-1 sm:w-[14rem] sm:max-w-[14rem]' : 'w-10 p-0'}`}
        >
          <button
            type="button"
            onClick={openSearch}
            className={`inline-flex shrink-0 items-center justify-center rounded-full text-oliveGray ${isSearchOpen ? 'h-8 w-8 pointer-events-none' : 'h-10 w-10'}`}
            aria-label="Open recipe search"
          >
            <Search className="h-4 w-4" />
          </button>
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search recipes"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-oliveGray transition-all duration-150 ${isSearchOpen ? 'ml-1 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
          />
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false)
              setSearchValue('')
            }}
            className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full text-oliveGray transition-[width,opacity] duration-150 hover:text-ink ${isSearchOpen ? 'w-8 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
            aria-label="Close recipe search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-paper transition-colors ${
            showFavoritesOnly
              ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
              : 'border-taupe bg-parchment text-oliveGray'
          }`}
          aria-label={showFavoritesOnly ? 'Show all recipes' : 'Show favorites only'}
          aria-pressed={showFavoritesOnly}
        >
          <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-terracotta/70' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowCreateDialog(true)
            setCreateMode('menu')
            setCreateError('')
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-olive text-parchment shadow-paper"
          aria-label="Add recipe"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>
    ) : undefined
  })

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
      <div className={`animate-rise ${viewMode === 'swipe' ? 'flex h-full flex-col' : 'space-y-4'}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="sticky top-0 z-10 flex h-0 justify-center overflow-visible pointer-events-none" aria-hidden="true">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-oat/90 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-oliveGray shadow-paper transition-transform duration-200"
            style={{ transform: `translateY(${refreshing || pullDistance ? 10 : -70}px)` }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Pull to refresh'}
          </div>
        </div>

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
              <RecipeCard
                key={recipe.slug}
                recipe={recipe}
                baseUrl={settings.baseUrl}
                onClick={() => navigate(`/recipes/${recipe.slug}`)}
                onLongPress={() => openRecipeActions(recipe)}
                isFavorite={recipe.id != null && favoriteIds.has(recipe.id)}
                onToggleFavorite={recipe.id != null ? () => setFavoriteIds(toggleFavorite(settings, recipe.id!)) : undefined}
              />
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
            onLongPress={(recipe) => openRecipeActions(recipe)}
            favoriteIds={favoriteIds}
            onToggleFavorite={(recipeId) => setFavoriteIds(toggleFavorite(settings, recipeId))}
          />
        )}
      </div>

      <DialogSheet
        open={showCreateDialog}
        title="New recipe"
        description="Choose how you want to bring a recipe into Mealie."
        onClose={resetCreateDialog}
        footer={
          createMode === 'menu'
            ? null
            : (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('menu')
                      setCreateError('')
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (createMode === 'url') {
                        void handleCreateFromUrl()
                      } else {
                        void handleCreateFromImages()
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment"
                  >
                    {creatingRecipe ? 'Importing…' : createMode === 'url' ? 'Import recipe' : 'Create from image'}
                  </button>
                </div>
              )
        }
      >
        {createMode === 'menu' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCreateMode('url')}
              className="rounded-[1.2rem] border border-taupe bg-cream px-4 py-3.5 text-left shadow-paper"
            >
              <LinkIcon className="h-5 w-5 text-terracotta" />
              <p className="mt-2 font-display text-xl tracking-[-0.03em] text-ink">Add via URL</p>
              <p className="mt-1 text-xs leading-5 text-oliveGray">Paste a link and let Mealie scrape it.</p>
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('image')}
              className="rounded-[1.2rem] border border-taupe bg-cream px-4 py-3.5 text-left shadow-paper"
            >
              <ImagePlus className="h-5 w-5 text-terracotta" />
              <p className="mt-2 font-display text-xl tracking-[-0.03em] text-ink">Add via image</p>
              <p className="mt-1 text-xs leading-5 text-oliveGray">Upload or capture a recipe photo.</p>
            </button>
          </div>
        )}

        {createMode === 'url' && (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Recipe URL</span>
              <input
                value={recipeUrl}
                onChange={(event) => setRecipeUrl(event.target.value)}
                placeholder="https://example.com/my-recipe"
                className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
              />
            </label>
            {createError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{createError}</p>}
          </div>
        )}

        {createMode === 'image' && (
          <div className="space-y-4">
            <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelection} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelection} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-taupe bg-cream px-5 py-3 text-sm font-semibold text-ink"
              >
                <Camera className="h-4 w-4" />
                Take photo
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-taupe bg-cream px-5 py-3 text-sm font-semibold text-ink"
              >
                <ImagePlus className="h-4 w-4" />
                Upload image
              </button>
            </div>

            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagePreviewUrls.map((previewUrl, index) => (
                  <img key={`${previewUrl}-${index}`} src={previewUrl} alt="Recipe import preview" className="aspect-square w-full rounded-[1.2rem] object-cover" />
                ))}
              </div>
            )}

            {createError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{createError}</p>}
          </div>
        )}
      </DialogSheet>

      <DialogSheet
        open={Boolean(selectedRecipe)}
        title={selectedRecipe?.name || 'Recipe actions'}
        onClose={closeRecipeActions}
        footer={
          recipeActionMode === 'mealplan'
            ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleAddRecipeToMealPlan()}
                    className="inline-flex items-center justify-center rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment"
                  >
                    {actionBusy ? 'Adding…' : 'Add to meal plan'}
                  </button>
                </div>
              )
            : null
        }
      >
        {recipeActionMode === 'menu' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setRecipeActionMode('mealplan')
                setActionError('')
              }}
              className="flex w-full items-center gap-3 rounded-[1.25rem] border border-taupe bg-cream px-4 py-4 text-left"
            >
              <CalendarPlus className="h-5 w-5 text-olive" />
              <div>
                <p className="font-semibold text-ink">Add to meal plan</p>
                <p className="text-sm leading-6 text-oliveGray">Pick a date and meal slot for this recipe.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex w-full items-center gap-3 rounded-[1.25rem] border border-terracotta/30 bg-terracotta/10 px-4 py-4 text-left"
            >
              <Trash2 className="h-5 w-5 text-terracotta" />
              <div>
                <p className="font-semibold text-terracotta">Delete recipe</p>
                <p className="text-sm leading-6 text-terracotta/80">Remove this recipe from Mealie.</p>
              </div>
            </button>
            {actionError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{actionError}</p>}
          </div>
        )}

        {recipeActionMode === 'mealplan' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-ink">Date</span>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {mealPlanDays.map((day) => {
                  const isSelected = day.key === mealPlanDate

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setMealPlanDate(day.key)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition-colors ${isSelected ? 'border-ink bg-ink text-parchment' : 'border-taupe bg-cream text-oliveGray'}`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-semibold text-ink">Meal Type</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_MEAL_TYPES.map((type) => {
                  const isSelected = type === mealPlanType

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMealPlanType(type)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${isSelected ? 'border-transparent bg-ink text-parchment' : 'border-taupe bg-cream text-ink'}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
            {actionError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{actionError}</p>}
          </div>
        )}
      </DialogSheet>

      <ConfirmDialog
        open={confirmDeleteOpen && Boolean(selectedRecipe)}
        title="Delete recipe"
        description={`Delete ${selectedRecipe?.name || 'this recipe'} from Mealie?`}
        confirmLabel="Delete recipe"
        busy={actionBusy}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteFromActions()}
      />
    </>
  )
}