import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls, useMotionValue, useTransform, animate } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { ShoppingListItem } from '@/types/mealie'
import { getShoppingItemText } from '@/lib/utils'

type ShoppingItemRowProps = {
  item: ShoppingListItem
  onDelete: (item: ShoppingListItem) => void
}

const DELETE_THRESHOLD = -72

export function ShoppingItemRow({ item, onDelete }: ShoppingItemRowProps) {
  const x = useMotionValue(0)
  const [deleting, setDeleting] = useState(false)
  const deleteReadyRef = useRef(false)
  const trashPulseControls = useAnimationControls()

  // Reveal the red trash background as user swipes left
  const trashOpacity = useTransform(x, [0, DELETE_THRESHOLD], [0, 1])
  const trashScale = useTransform(x, [0, DELETE_THRESHOLD], [0.6, 1])

  useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      const isReady = latest <= DELETE_THRESHOLD

      if (isReady && !deleteReadyRef.current) {
        deleteReadyRef.current = true
        trashPulseControls.set({ scale: 1, rotate: 0 })
        void trashPulseControls.start({
          scale: [1, 1.28, 0.9, 1],
          rotate: [0, -10, 6, 0],
          transition: { duration: 0.28, times: [0, 0.35, 0.72, 1] }
        })
      }

      if (!isReady) {
        deleteReadyRef.current = false
      }
    })

    return unsubscribe
  }, [trashPulseControls, x])

  async function handleDragEnd() {
    if (deleting) return
    if (x.get() <= DELETE_THRESHOLD) {
      setDeleting(true)
      // Animate item fully off-screen left then call onDelete
      await animate(x, -400, { duration: 0.22, ease: 'easeIn' })
      onDelete(item)
    } else {
      // Snap back
      void animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[1.35rem]">
      {/* Delete background */}
      <motion.div
        style={{ opacity: trashOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[1.35rem] bg-terracotta px-5"
        aria-hidden
      >
        <motion.div animate={trashPulseControls} style={{ scale: trashScale }}>
          <Trash2 className="h-5 w-5 text-parchment" />
        </motion.div>
      </motion.div>

      {/* Swipeable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: DELETE_THRESHOLD * 1.5, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x }}
        onDragEnd={() => void handleDragEnd()}
        className="relative grid w-full grid-cols-[1fr] items-start rounded-[1.35rem] border border-taupe/65 bg-parchment px-4 py-4 text-left shadow-paper"
      >
        <span className="block text-base leading-6 text-ink">
          {[
            item.quantity != null && item.quantity !== '' ? item.quantity : null,
            item.unit?.abbreviation || item.unit?.name || null,
            item.food?.name || item.display || item.note || 'Untitled item'
          ]
            .filter(Boolean)
            .join(' ')}
        </span>
      </motion.div>
    </div>
  )
}