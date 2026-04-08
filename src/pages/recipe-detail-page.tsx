import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Minus, Plus, Sparkles } from 'lucide-react'
import type { Recipe } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { EmptyState } from '@/components/empty-state'
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
  const { settings } = useSettings()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scale, setScale] = useState(1)
  const [cookMode, setCookMode] = useState(false)

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

  if (loading) {
    return <EmptyState title="Loading recipe" description="Gathering ingredients, method, and imagery from Mealie." />
  }

  if (error || !recipe) {
    return <EmptyState title="Recipe unavailable" description={error || 'This recipe could not be found.'} />
  }

  const image = getRecipeImageUrl(settings.baseUrl, recipe)

  return (
    <div className={`space-y-5 animate-rise ${cookMode ? 'pb-20' : ''}`}>
      <Link to="/recipes" className="inline-flex items-center gap-2 text-sm font-semibold text-oliveGray">
        Back to recipes
      </Link>

      <section className="overflow-hidden rounded-card border border-taupe/70 bg-parchment shadow-paper">
        {image ? (
          <div className="bg-oat p-4 sm:p-5">
            <img src={image} alt={recipe.name || 'Recipe'} className="aspect-[5/4] w-full rounded-[1.5rem] object-cover sm:aspect-[16/9]" />
          </div>
        ) : null}

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-oliveGray">
              <span>{formatDuration(recipe.totalTime)}</span>
              <span>{recipe.recipeServings || 1} servings</span>
              <span>{formatRelativeCookedDate(recipe.lastMade)}</span>
            </div>
            <h2 className="max-w-3xl font-display text-4xl leading-none tracking-[-0.04em] text-ink sm:text-5xl">{recipe.name || 'Untitled recipe'}</h2>
            <p className="max-w-2xl text-sm leading-7 text-oliveGray">{recipe.description || 'A recipe collected into your private cooking journal.'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setScale((current) => Math.max(0.5, current - 0.5))}
              className="inline-flex items-center gap-2 rounded-full border border-taupe bg-cream px-4 py-3 text-sm font-semibold text-ink"
            >
              <Minus className="h-4 w-4" />
              Scale {scale}x
            </button>
            <button
              type="button"
              onClick={() => setScale((current) => Math.min(4, current + 0.5))}
              className="inline-flex items-center gap-2 rounded-full border border-taupe bg-cream px-4 py-3 text-sm font-semibold text-ink"
            >
              <Plus className="h-4 w-4" />
              Increase
            </button>
            <button
              type="button"
              onClick={() => setCookMode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-parchment"
            >
              <Sparkles className="h-4 w-4" />
              {cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
            </button>
            {recipe.orgURL && (
              <a href={recipe.orgURL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-taupe bg-cream px-4 py-3 text-sm font-semibold text-ink">
                <ExternalLink className="h-4 w-4" />
                Source
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <article className="rounded-card border border-taupe/70 bg-oat/65 px-5 py-6 shadow-paper sm:px-6">
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Ingredients</h3>
          <ul className="mt-4 space-y-3">
            {recipe.recipeIngredient.map((ingredient, index) => {
              const scaledValue = scaleQuantity(ingredient.quantity, scale)

              return (
                <li key={`${ingredient.food?.name || ingredient.display || 'ingredient'}-${index}`} className="rounded-[1.2rem] bg-parchment px-4 py-3 shadow-paper">
                  <p className="text-sm font-semibold text-ink">
                    {scaledValue !== null ? `${scaledValue} ` : ''}
                    {ingredient.unit?.abbreviation || ingredient.unit?.name ? `${ingredient.unit?.abbreviation || ingredient.unit?.name} ` : ''}
                    {ingredient.food?.name || ingredient.display || ingredient.originalText || 'Ingredient'}
                  </p>
                  {ingredient.note && <p className="mt-1 text-sm leading-6 text-oliveGray">{ingredient.note}</p>}
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
                  <p className={`mt-1 text-oliveGray ${cookMode ? 'text-lg leading-8 text-ink' : 'text-sm leading-7'}`}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  )
}