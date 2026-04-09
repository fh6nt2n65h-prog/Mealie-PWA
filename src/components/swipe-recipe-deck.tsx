import { AnimatePresence, motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { useRef } from 'react'
import type { Recipe } from '@/types/mealie'
import { RecipeCard } from '@/components/recipe-card'

type SwipeRecipeDeckProps = {
  recipes: Recipe[]
  currentIndex: number
  onChangeIndex: (index: number) => void
  baseUrl: string
  onSelect: (slug: string) => void
  onLongPress?: (recipe: Recipe) => void
  favoriteIds?: Set<string>
  onToggleFavorite?: (recipeId: string) => void
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '105%' : '-105%' }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-105%' : '105%' }),
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.7 }

export function SwipeRecipeDeck({ recipes, currentIndex, onChangeIndex, baseUrl, onSelect, onLongPress, favoriteIds, onToggleFavorite }: SwipeRecipeDeckProps) {
  const recipe = recipes[currentIndex]
  const directionRef = useRef(0)
  const count = recipes.length

  if (!recipe) {
    return null
  }

  function goForward() {
    directionRef.current = 1
    onChangeIndex((currentIndex + 1) % count)
  }

  function goBack() {
    directionRef.current = -1
    onChangeIndex((currentIndex - 1 + count) % count)
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -48 || info.velocity.x < -350) {
      goForward()
    } else if (info.offset.x > 48 || info.velocity.x > 350) {
      goBack()
    }
  }

  return (
    <div className="relative min-h-[22rem] flex-1 overflow-hidden">
      <AnimatePresence initial={false} custom={directionRef.current}>
        <motion.div
          key={recipe.slug}
          custom={directionRef.current}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          transition={spring}
          className="absolute inset-0"
        >
          <RecipeCard
            recipe={recipe}
            baseUrl={baseUrl}
            onClick={() => onSelect(recipe.slug)}
            onLongPress={onLongPress ? () => onLongPress(recipe) : undefined}
            isFavorite={recipe.id ? favoriteIds?.has(recipe.id) : false}
            onToggleFavorite={recipe.id && onToggleFavorite ? () => onToggleFavorite(recipe.id!) : undefined}
            featured
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}