import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
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
  const previousIndexRef = useRef(currentIndex)

  const direction = currentIndex === previousIndexRef.current ? 0 : currentIndex > previousIndexRef.current ? 1 : -1
  const enterX = direction === 0 ? 0 : direction > 0 ? 56 : -56
  const exitX = direction === 0 ? 0 : direction > 0 ? -56 : 56

  useEffect(() => {
    previousIndexRef.current = currentIndex
  }, [currentIndex])

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
    <div className="relative h-[calc(100dvh-14rem)] min-h-[34rem] overflow-hidden sm:h-[calc(100dvh-16rem)] sm:min-h-[38rem]">
      <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={recipe.slug}
            custom={direction}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            className="absolute inset-0"
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) {
                goTo(currentIndex + 1)
              }

              if (info.offset.x > 80) {
                goTo(currentIndex - 1)
              }
            }}
            initial={{ x: enterX }}
            animate={{ x: 0 }}
            exit={{ x: exitX }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <RecipeCard recipe={recipe} baseUrl={baseUrl} onClick={() => onSelect(recipe.slug)} onLongPress={onLongPress ? () => onLongPress(recipe) : undefined} featured />
          </motion.div>
      </AnimatePresence>
    </div>
  )
}