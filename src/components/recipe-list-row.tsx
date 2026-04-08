import type { Recipe, RecipeSummary } from '@/types/mealie'
import { formatDuration, getRecipeImageUrl } from '@/lib/utils'

type RecipeListRowProps = {
  recipe: Recipe | RecipeSummary
  baseUrl: string
  onClick: () => void
}

export function RecipeListRow({ recipe, baseUrl, onClick }: RecipeListRowProps) {
  const image = getRecipeImageUrl(baseUrl, recipe)

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[88px_1fr] gap-4 rounded-[1.4rem] border border-taupe/70 bg-parchment p-3 text-left shadow-paper transition-transform duration-200 hover:-translate-y-0.5"
    >
      {image ? (
        <img src={image} alt={recipe.name || 'Recipe'} className="h-[88px] w-[88px] rounded-[1rem] object-cover" />
      ) : (
        <div className="h-[88px] w-[88px] rounded-[1rem] bg-oat" />
      )}

      <div className="min-w-0 space-y-1.5 py-1">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.26em] text-oliveGray">{formatDuration(recipe.totalTime)}</p>
        <h3 className="truncate font-display text-2xl tracking-[-0.03em] text-ink">{recipe.name || 'Untitled recipe'}</h3>
        <p className="line-clamp-2 text-sm leading-6 text-oliveGray">{recipe.description || 'Collected for another evening in the kitchen.'}</p>
      </div>
    </button>
  )
}