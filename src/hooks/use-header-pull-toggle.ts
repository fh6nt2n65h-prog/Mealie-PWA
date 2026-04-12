import { useRef, useState } from 'react'

type UseHeaderPullToggleOptions = {
  onToggle: () => void
  pullThreshold?: number
  maxPullDistance?: number
  dampingFactor?: number
}

export function useHeaderPullToggle({
  onToggle,
  pullThreshold = 70,
  maxPullDistance = 96,
  dampingFactor = 0.45
}: UseHeaderPullToggleOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchIntentRef = useRef<'undetermined' | 'vertical' | 'horizontal'>('undetermined')
  const firedRef = useRef(false)

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0]

    if (!touch) {
      return
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    touchIntentRef.current = 'undetermined'
    firedRef.current = false
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (touchStartRef.current === null) {
      return
    }

    const touch = event.touches[0]

    if (!touch) {
      return
    }

    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaX = touch.clientX - touchStartRef.current.x

    if (touchIntentRef.current === 'undetermined') {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        touchIntentRef.current = 'horizontal'
        setPullDistance(0)
        return
      }

      if (Math.abs(deltaY) > 10) {
        touchIntentRef.current = 'vertical'
      }
    }

    if (touchIntentRef.current === 'horizontal') {
      setPullDistance(0)
      return
    }

    if (deltaY > 0) {
      const damped = Math.min(deltaY * dampingFactor, maxPullDistance)
      setPullDistance(damped)
    } else {
      setPullDistance(0)
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= pullThreshold && !firedRef.current) {
      firedRef.current = true
      onToggle()
    }

    setPullDistance(0)
    touchStartRef.current = null
  }

  return {
    pullDistance,
    pullThreshold,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}
