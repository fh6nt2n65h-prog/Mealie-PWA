import clsx from 'clsx'
import { useRef } from 'react'
import { AnimatedHeartIcon } from '@/components/animated-heart-icon'
import type { Recipe, RecipeSummary } from '@/types/mealie'
import { formatDuration, getRecipeImageUrl } from '@/lib/utils'

const HIDDEN_CATEGORY_SLUGS = ['savoury', 'sweet']

type RecipeCardProps = {
  recipe: Recipe | RecipeSummary
  baseUrl: string
  onClick: () => void
  onLongPress?: () => void
  onToggleFavorite?: () => void
  isFavorite?: boolean
  compact?: boolean
  featured?: boolean
}

export function RecipeCard({ recipe, baseUrl, onClick, onLongPress, onToggleFavorite, isFavorite = false, compact = false, featured = false }: RecipeCardProps) {
  const image = getRecipeImageUrl(baseUrl, recipe, 'small')
  const longPressTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function startLongPress() {
    if (!onLongPress) {
      return
    }

    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true
      onLongPress()
    }, 480)
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={(event) => {
        if (!onLongPress) {
          return
        }

        event.preventDefault()
        onLongPress()
      }}
      onMouseDown={(event) => {
        if (event.button === 0) {
          startLongPress()
        }
      }}
      onMouseUp={clearLongPressTimer}
      onMouseLeave={clearLongPressTimer}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0].clientX
        touchStartYRef.current = e.touches[0].clientY
        startLongPress()
      }}
      onTouchMove={(e) => {
        const dx = e.touches[0].clientX - (touchStartXRef.current ?? e.touches[0].clientX)
        const dy = e.touches[0].clientY - (touchStartYRef.current ?? e.touches[0].clientY)
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPressTimer()
      }}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      className={clsx(
        'h-full overflow-hidden rounded-card border border-taupe/75 bg-parchment text-left shadow-paper select-none touch-manipulation [user-select:none] [-webkit-touch-callout:none]',
        compact ? 'grid grid-cols-[1fr_auto] gap-5 p-4' : 'flex flex-col'
      )}
    >
      {!compact && (
        <div className="relative bg-oat p-3">
          {image ? (
            <img src={image} alt={recipe.name || 'Recipe'} className={clsx('w-full rounded-[1.15rem] object-cover', featured ? 'aspect-[1/1]' : 'aspect-[4/3]')} />
          ) : (
            <div className={clsx('rounded-[1.15rem] bg-gradient-to-br from-oat via-parchment to-cream', featured ? 'aspect-[1/1]' : 'aspect-[4/3]')} />
          )}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-parchment/80 backdrop-blur-sm shadow-paper"
            >
              <AnimatedHeartIcon active={isFavorite} className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className={clsx('space-y-3', compact ? 'py-1' : 'flex flex-1 flex-col px-5 pb-5 pt-2')}>
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{formatDuration(recipe.totalTime)}</p>
          <h3 className={clsx('line-clamp-2 leading-tight tracking-[-0.03em] text-ink', featured ? 'min-h-[4.75rem] font-display text-[2.2rem]' : 'min-h-[3.9rem] font-display text-2xl')}>{recipe.name || 'Untitled recipe'}</h3>
        </div>

        <p className={clsx('text-oliveGray', featured ? 'line-clamp-4 min-h-[6rem] text-base leading-7' : 'line-clamp-3 min-h-[4.75rem] text-sm leading-6')}>{recipe.description || 'A quiet favorite waiting to be cooked again.'}</p>

        <div className="mt-auto flex min-h-[2rem] flex-wrap gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-oliveGray">
          {recipe.recipeCategory?.filter((c) => !HIDDEN_CATEGORY_SLUGS.includes(c.slug)).slice(0, 2).map((category) => (
            <span key={category.slug} className="rounded-full bg-oat px-2.5 py-0.5">
              {category.name}
            </span>
          ))}
          {recipe.tags?.slice(0, 1).map((tag) => (
            <span key={tag.slug} className="rounded-full bg-sage/25 px-2.5 py-0.5 text-olive">
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}