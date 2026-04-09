import { useRef, useState } from 'react'

type UsePullToRefreshOptions = {
  onRefresh: () => void | Promise<void>
  scrollContainerId?: string
  pullThreshold?: number
  maxPullDistance?: number
  dampingFactor?: number
}

export function usePullToRefresh({
  onRefresh,
  scrollContainerId = 'app-scroll-root',
  pullThreshold = 56,
  maxPullDistance = 96,
  dampingFactor = 0.45
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const touchIntentRef = useRef<'undetermined' | 'vertical' | 'horizontal'>('undetermined')

  function getScrollRoot() {
    if (typeof document === 'undefined') {
      return null
    }
    return document.getElementById(scrollContainerId)
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const scrollRoot = getScrollRoot()

    if (scrollRoot && scrollRoot.scrollTop <= 0 && !refreshing) {
      const touch = event.touches[0]

      if (!touch) {
        return
      }

      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      touchIntentRef.current = 'undetermined'
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartRef.current === null) {
      return
    }

    const scrollRoot = getScrollRoot()

    if (scrollRoot && scrollRoot.scrollTop > 0) {
      setPullDistance(0)
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
      setPullDistance(Math.min(deltaY * dampingFactor, maxPullDistance))
    }
  }

  function handleTouchEnd() {
    const shouldRefresh = touchIntentRef.current === 'vertical' && pullDistance >= pullThreshold
    touchStartRef.current = null
    touchIntentRef.current = 'undetermined'
    setPullDistance(0)

    if (shouldRefresh) {
      setRefreshing(true)
      Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false)
      })
    }
  }

  return {
    pullDistance,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}
