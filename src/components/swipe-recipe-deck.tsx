import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Recipe } from '@/types/mealie'
import { RecipeCard } from '@/components/recipe-card'

type SwipeRecipeDeckProps = {
  recipes: Recipe[]
  currentIndex: number
  onChangeIndex: (index: number) => void
  baseUrl: string
  onSelect: (slug: string) => void
}

export function SwipeRecipeDeck({ recipes, currentIndex, onChangeIndex, baseUrl, onSelect }: SwipeRecipeDeckProps) {
  const recipe = recipes[currentIndex]

  if (!recipe) {
    return null
  }

  function goTo(index: number) {
    if (index < 0 || index > recipes.length - 1) {
      return
    }

    onChangeIndex(index)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-oliveGray">
        <span>Swipe through the library</span>
        <span>
          {currentIndex + 1} / {recipes.length}
        </span>
      </div>

      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={recipe.slug}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90) {
                goTo(currentIndex + 1)
              }

              if (info.offset.x > 90) {
                goTo(currentIndex - 1)
              }
            }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <RecipeCard recipe={recipe} baseUrl={baseUrl} onClick={() => onSelect(recipe.slug)} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between rounded-full border border-taupe/70 bg-parchment px-4 py-3 shadow-paper">
        <button
          type="button"
          onClick={() => goTo(currentIndex - 1)}
          className="inline-flex items-center gap-2 rounded-full bg-oat px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40"
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(currentIndex + 1)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-parchment disabled:opacity-40"
          disabled={currentIndex === recipes.length - 1}
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}