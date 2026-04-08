import clsx from 'clsx'
import type { Recipe, RecipeSummary } from '@/types/mealie'
import { formatDuration, getRecipeImageUrl } from '@/lib/utils'

type RecipeCardProps = {
  recipe: Recipe | RecipeSummary
  baseUrl: string
  onClick: () => void
  compact?: boolean
}

export function RecipeCard({ recipe, baseUrl, onClick, compact = false }: RecipeCardProps) {
  const image = getRecipeImageUrl(baseUrl, recipe)

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'overflow-hidden rounded-card border border-taupe/75 bg-parchment text-left shadow-paper transition-transform duration-200 hover:-translate-y-1',
        compact ? 'grid grid-cols-[1fr_auto] gap-5 p-4' : 'block'
      )}
    >
      {!compact && (
        <div className="bg-oat p-3">
          {image ? (
            <img src={image} alt={recipe.name || 'Recipe'} className="aspect-[4/3] w-full rounded-[1.15rem] object-cover" />
          ) : (
            <div className="aspect-[4/3] rounded-[1.15rem] bg-gradient-to-br from-oat via-parchment to-cream" />
          )}
        </div>
      )}

      <div className={clsx('space-y-3', compact ? 'py-1' : 'px-5 pb-5 pt-2')}>
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{formatDuration(recipe.totalTime)}</p>
          <h3 className="font-display text-2xl leading-tight tracking-[-0.03em] text-ink">{recipe.name || 'Untitled recipe'}</h3>
        </div>

        <p className="line-clamp-2 text-sm leading-6 text-oliveGray">{recipe.description || 'A quiet favorite waiting to be cooked again.'}</p>

        <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-oliveGray">
          {recipe.recipeCategory?.slice(0, 2).map((category) => (
            <span key={category.slug} className="rounded-full bg-oat px-3 py-1">
              {category.name}
            </span>
          ))}
          {recipe.tags?.slice(0, 1).map((tag) => (
            <span key={tag.slug} className="rounded-full bg-sage/25 px-3 py-1 text-olive">
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}