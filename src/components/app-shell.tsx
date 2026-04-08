import { useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { HeaderSlotsProvider, useHeaderSlotState } from '@/app/header-slots-context'
import { BottomNav } from '@/components/bottom-nav'

const TAB_ROUTES = ['/recipes', '/meal-plan', '/shopping-list', '/settings']
const EDGE_ZONE = 24
const SWIPE_MIN = 50

function resolveTitle(pathname: string) {
  if (pathname.startsWith('/meal-plan')) {
    return 'Meal Plan'
  }

  if (pathname.startsWith('/shopping-list')) {
    return 'Shopping List'
  }

  if (pathname.startsWith('/settings')) {
    return 'Kitchen Settings'
  }

  if (pathname.startsWith('/recipes/')) {
    return 'Recipe'
  }

  return 'Recipes'
}

function getTabIndex(pathname: string) {
  for (let i = 0; i < TAB_ROUTES.length; i++) {
    if (pathname === TAB_ROUTES[i] || pathname.startsWith(TAB_ROUTES[i] + '/')) {
      return i
    }
  }

  return -1
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const slots = useHeaderSlotState()

  const tabIndex = getTabIndex(location.pathname)
  const prevTabIndexRef = useRef(tabIndex)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)

  const isTabSwitch = tabIndex >= 0 && prevTabIndexRef.current >= 0 && tabIndex !== prevTabIndexRef.current
  const direction = isTabSwitch ? (tabIndex > prevTabIndexRef.current ? 1 : -1) : 0

  useEffect(() => {
    if (tabIndex >= 0) {
      prevTabIndexRef.current = tabIndex
    }
  }, [tabIndex])

  const isTopLevelTab = tabIndex >= 0 && TAB_ROUTES[tabIndex] === location.pathname

  function handleEdgeTouchStart(event: React.TouchEvent) {
    if (!isTopLevelTab) {
      return
    }

    const touch = event.touches[0]

    if (!touch) {
      return
    }

    const x = touch.clientX

    if (x <= EDGE_ZONE || x >= window.innerWidth - EDGE_ZONE) {
      swipeRef.current = { x, y: touch.clientY }
    }
  }

  function handleEdgeTouchEnd(event: React.TouchEvent) {
    if (!swipeRef.current || !isTopLevelTab) {
      swipeRef.current = null
      return
    }

    const touch = event.changedTouches[0]

    if (!touch) {
      swipeRef.current = null
      return
    }

    const dx = touch.clientX - swipeRef.current.x
    const dy = Math.abs(touch.clientY - swipeRef.current.y)
    const adx = Math.abs(dx)
    swipeRef.current = null

    if (adx < SWIPE_MIN || adx < dy * 1.2) {
      return
    }

    if (dx > 0 && tabIndex > 0) {
      navigate(TAB_ROUTES[tabIndex - 1])
    } else if (dx < 0 && tabIndex < TAB_ROUTES.length - 1) {
      navigate(TAB_ROUTES[tabIndex + 1])
    }
  }

  const animationKey = tabIndex >= 0 ? TAB_ROUTES[tabIndex] : location.pathname

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[880px] flex-col overflow-hidden bg-halo bg-[length:100%_100%] px-3 pb-2 pt-3 sm:px-5 sm:pt-5">
      <div className="flex h-full flex-col overflow-hidden rounded-shell border border-taupe/70 bg-cream/95 shadow-paper ring-1 ring-white/70 backdrop-blur-sm">
        <header className="safe-top border-b border-b-taupe/70 bg-wash px-5 pb-3 pt-4 sm:px-7 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[32rem] animate-rise">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-oliveGray">{dayjs().format('dddd, MMMM D')}</p>
              <h1 className="mt-2 font-display text-[2.35rem] leading-none tracking-[-0.03em] text-ink sm:text-[3.25rem]">{resolveTitle(location.pathname)}</h1>
            </div>
            {slots.sideContent && <div className="flex shrink-0 items-center gap-2 self-end">{slots.sideContent}</div>}
          </div>

          {slots.bottomContent && <div className="mt-3">{slots.bottomContent}</div>}
        </header>

        <main
          id="app-scroll-root"
          className="grain-bg flex-1 overflow-y-auto px-5 pb-6 pt-3 sm:px-7 sm:pb-8"
          onTouchStart={handleEdgeTouchStart}
          onTouchEnd={handleEdgeTouchEnd}
        >
          <motion.div
            key={animationKey}
            initial={direction !== 0 ? { opacity: 0, x: direction * 30 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <HeaderSlotsProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </HeaderSlotsProvider>
  )
}