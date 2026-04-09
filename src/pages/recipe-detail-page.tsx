import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListPlus, Minus, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Recipe } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { EmptyState } from '@/components/empty-state'
import { removeRecipeCacheEntry, upsertRecipeCacheEntry } from '@/lib/recipe-cache'
import { MealieApi } from '@/lib/mealie-api'
import { formatDuration, formatRelativeCookedDate, getRecipeImageUrl } from '@/lib/utils'

function scaleQuantity(quantity: number | null | undefined, scale: number) {
  if (quantity === null || quantity === undefined) {
    return null
  }

  return Math.round(quantity * scale * 100) / 100
}

export function RecipeDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [servings, setServings] = useState(1)
  const [cookMode, setCookMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [buttonsInView, setButtonsInView] = useState(true)
  const [listAddStatus, setListAddStatus] = useState<'idle' | 'adding' | 'done' | 'error'>('idle')
  const buttonsRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRecipe() {
      if (!slug || !settings.apiToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const api = new MealieApi(settings)
        const detail = await api.getRecipe(slug)

        if (!cancelled) {
          setRecipe(detail)
          setServings(detail.recipeServings || 1)
          upsertRecipeCacheEntry(settings, detail)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this recipe.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRecipe()

    return () => {
      cancelled = true
    }
  }, [settings, slug])

  useEffect(() => {
    const el = buttonsRowRef.current

    if (!el) {
      return
    }

    const root = document.getElementById('app-scroll-root')
    const observer = new IntersectionObserver(
      ([entry]) => setButtonsInView(entry?.isIntersecting ?? true),
      { root, threshold: 0 }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [recipe])

  if (loading) {
    return <EmptyState title="Loading recipe" description="Gathering ingredients, method, and imagery from Mealie." />
  }

  if (error || !recipe) {
    return <EmptyState title="Recipe unavailable" description={error || 'This recipe could not be found.'} />
  }

  const image = getRecipeImageUrl(settings.baseUrl, recipe)

  async function handleAddToShoppingList() {
    if (!recipe?.id || listAddStatus === 'adding') {
      return
    }

    setListAddStatus('adding')

    try {
      const api = new MealieApi(settings)
      const lists = await api.getShoppingLists()
      const list = lists.items[0]

      if (!list) {
        setListAddStatus('error')
        window.setTimeout(() => setListAddStatus('idle'), 2000)
        return
      }

      await api.addRecipeToShoppingList(list.id, recipe.id)
      setListAddStatus('done')
      window.setTimeout(() => setListAddStatus('idle'), 1800)
    } catch {
      setListAddStatus('error')
      window.setTimeout(() => setListAddStatus('idle'), 2000)
    }
  }

  async function handleDeleteRecipe() {
    if (!recipe || deleting) {
      return
    }

    const confirmed = window.confirm(`Delete ${recipe.name || 'this recipe'} from Mealie?`)

    if (!confirmed) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const api = new MealieApi(settings)
      await api.deleteRecipe(recipe.slug)
      removeRecipeCacheEntry(settings, recipe.slug)
      navigate('/recipes', { replace: true })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this recipe.')
      setDeleting(false)
    }
  }

  return (
    <div className={`space-y-5 animate-rise ${cookMode ? 'pb-6' : ''}`}>
      {/* Sticky cook-mode shortcut — visible only when the buttons row has scrolled above the fold */}
      <div className={`sticky top-2 z-20 h-0 overflow-visible transition-opacity duration-150 ${buttonsInView ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <div className={`flex ${cookMode ? 'justify-start' : 'justify-end'}`}>
          <button
            type="button"
            onClick={() => setCookMode((c) => !c)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full shadow-paper ${cookMode ? 'bg-cream text-ink border border-taupe' : 'bg-ink text-parchment'}`}
            aria-label={cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Link to="/recipes" className="inline-flex items-center gap-2 text-sm font-semibold text-oliveGray">
        Back to recipes
      </Link>

      <section className="overflow-hidden rounded-card border border-taupe/70 bg-parchment shadow-paper">
        {image ? (
          <div className="bg-oat p-2 sm:p-3">
            <img src={image} alt={recipe.name || 'Recipe'} className="aspect-[4/5] w-full rounded-[1.65rem] object-cover sm:aspect-[5/4]" />
          </div>
        ) : null}

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-oliveGray">
              <span>{formatDuration(recipe.totalTime)}</span>
              <span>{recipe.recipeServings || 1} servings</span>
              <span>{formatRelativeCookedDate(recipe.lastMade)}</span>
            </div>
            <h2 className="max-w-3xl font-display text-4xl leading-none tracking-[-0.04em] text-ink sm:text-5xl">{recipe.name || 'Untitled recipe'}</h2>
            <p className="max-w-2xl text-sm leading-7 text-oliveGray">{recipe.description || 'A recipe collected into your private cooking journal.'}</p>
          </div>

          <div ref={buttonsRowRef} className="flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-taupe bg-cream px-1.5 py-1 text-xs font-semibold text-ink">
              <span className="px-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-oliveGray">Servings</span>
              <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-ink">
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[2rem] text-center text-xs">{servings}</span>
              <button type="button" onClick={() => setServings((s) => Math.min(50, s + 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-ink">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCookMode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2.5 text-xs font-semibold text-parchment"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
            </button>
            <button
              type="button"
              onClick={handleDeleteRecipe}
              disabled={deleting}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Delete recipe"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {error && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{error}</p>}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <article className="rounded-card border border-taupe/70 bg-oat/65 px-5 py-6 shadow-paper sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Ingredients</h3>
            {!cookMode && (
              <button
                type="button"
                onClick={() => void handleAddToShoppingList()}
                disabled={listAddStatus === 'adding'}
                className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-olive transition-opacity disabled:opacity-60"
                aria-label="Add all ingredients to shopping list"
              >
                {listAddStatus === 'done' && 'Added!'}
                {listAddStatus === 'error' && 'No list'}
                {(listAddStatus === 'idle' || listAddStatus === 'adding') && (
                  <><ListPlus className="h-3.5 w-3.5" />{listAddStatus === 'adding' ? 'Adding…' : 'Add all'}</>
                )}
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-3">
            {recipe.recipeIngredient.map((ingredient, index) => {
              const baseServings = recipe.recipeServings || 1
              const scaledValue = scaleQuantity(ingredient.quantity, servings / baseServings)

              return (
                <li key={`${ingredient.food?.name || ingredient.display || 'ingredient'}-${index}`} className="rounded-[1.2rem] bg-parchment px-4 py-2 shadow-paper">
                  <p className="text-sm font-semibold leading-snug text-ink">
                    {scaledValue !== null ? `${scaledValue} ` : ''}
                    {ingredient.unit?.abbreviation || ingredient.unit?.name ? `${ingredient.unit?.abbreviation || ingredient.unit?.name} ` : ''}
                    {ingredient.food?.name || ingredient.display || ingredient.originalText || 'Ingredient'}
                  </p>
                  {ingredient.note && <p className="mt-0 line-clamp-1 text-xs leading-4 text-oliveGray">{ingredient.note}</p>}
                </li>
              )
            })}
          </ul>
        </article>

        <article className={`rounded-card border border-taupe/70 px-5 py-6 shadow-paper sm:px-6 ${cookMode ? 'bg-parchment' : 'bg-parchment/95'}`}>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Method</h3>
          <ol className="mt-5 space-y-5">
            {(recipe.recipeInstructions || []).map((step, index) => (
              <li key={step.id || `${index}`} className="grid gap-3 rounded-[1.4rem] bg-cream px-4 py-4 shadow-paper sm:grid-cols-[52px_1fr] sm:px-5 sm:py-5">
                <span className="font-display text-4xl leading-none text-terracotta">{index + 1}</span>
                <div>
                  {step.title && <h4 className="text-base font-semibold text-ink">{step.title}</h4>}
                  <p className={`mt-1 ${cookMode ? 'text-xl leading-9 text-ink' : 'text-sm leading-7 text-oliveGray'}`}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  )
}