import { AnimatePresence, motion } from 'framer-motion'
import type { Recipe } from '@/types/mealie'
import { RecipeCard } from '@/components/recipe-card'

type SwipeRecipeDeckProps = {
  recipes: Recipe[]
  currentIndex: number
  onChangeIndex: (index: number) => void
  baseUrl: string
  onSelect: (slug: string) => void
  onLongPress?: (recipe: Recipe) => void
}

export function SwipeRecipeDeck({ recipes, currentIndex, onChangeIndex, baseUrl, onSelect, onLongPress }: SwipeRecipeDeckProps) {
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
    <div className="min-h-[420px]">
      <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={recipe.slug}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) {
                goTo(currentIndex + 1)
              }

              if (info.offset.x > 80) {
                goTo(currentIndex - 1)
              }
            }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ duration: 0.21, ease: 'easeOut' }}
          >
            <RecipeCard recipe={recipe} baseUrl={baseUrl} onClick={() => onSelect(recipe.slug)} onLongPress={onLongPress ? () => onLongPress(recipe) : undefined} featured />
          </motion.div>
      </AnimatePresence>
    </div>
  )
}