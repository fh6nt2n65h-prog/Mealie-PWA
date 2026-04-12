import dayjs from 'dayjs'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { HeaderSlotsProvider, useHeaderSlotState } from '@/app/header-slots-context'
import { useSettings } from '@/app/settings-context'
import { BottomNav } from '@/components/bottom-nav'

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

function AppShellFrame({ children }: { children: ReactNode }) {
  const location = useLocation()
  const slots = useHeaderSlotState()
  const { isAnimating, isSweetMode } = useSettings()

  const pullDist = slots.headerPullDistance || 0
  const blobColor = (isSweetMode === isAnimating) ? 'rgb(214, 238, 255)' : 'rgb(251, 248, 242)' // blue vs parchment

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-halo bg-[length:100%_100%] relative z-0">
      {/* Inject SVG Gooey Filter */}
      <svg width="0" height="0" className="pointer-events-none fixed">
        <defs>
          <filter id="goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="app-shell-frame relative z-0 flex h-full flex-col overflow-hidden bg-cream/95">
        <header
          className="relative z-10 safe-top border-b border-transparent bg-transparent px-5 pb-3 pt-4 sm:px-7 sm:pb-4 sm:pt-5"
          {...(slots.headerTouchHandlers ?? {})}
        >
          {/* Gooey Filter Overlay Layer */}
          <div 
            className="pointer-events-none absolute -inset-x-20 -bottom-20 -top-20 z-0 bg-transparent"
            style={{ filter: "url('#goo')" }}
          >
            {/* The Solid Header Background (underlay, same height as header) */}
            <div className="absolute inset-x-20 top-20 bottom-20 bg-wash border-b border-b-taupe/70 origin-top" />
            
            {/* The Stretching/Pouring Blob overlapping the bottom border */}
            <motion.div
              className="absolute top-1/3 left-1/2 -ml-[45vw]"
              style={{ 
                backgroundColor: blobColor,
                width: '90vw',
                height: 60,
                borderRadius: '50%'
              }}
              initial={false}
              animate={{
                y: isAnimating ? (window.innerHeight * 0.8) : (pullDist * 0.5),
                scaleY: isAnimating ? 30 : Math.max(1, 0.8 + pullDist * 0.08),
                borderRadius: isAnimating ? '0%' : '50%',
              }}
              transition={
                isAnimating 
                  ? { type: 'spring', damping: 12, stiffness: 90, mass: 1 }
                  : { type: 'tween', duration: 0.05 }
              }
            />
          </div>

          <div className="relative z-10 flex flex-col pt-[max(0rem,_env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 max-w-[32rem] animate-rise">
                <p className="truncate whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">{dayjs().format('dddd, MMMM D')}</p>
                <motion.h1 
                  className="mt-2 font-display text-[2.35rem] leading-none tracking-[-0.03em] text-ink sm:text-[3.25rem]"
                  initial={{ scale: 1 }}
                  animate={isAnimating ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
                  transition={isAnimating ? { duration: 0.5, delay: 0.15, ease: "easeOut" } : { duration: 0 }}
                >
                  {resolveTitle(location.pathname)}
                </motion.h1>
              </div>
              {slots.sideContent && <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 self-end relative z-10">{slots.sideContent}</div>}
            </div>

            {slots.bottomContent && <div className="relative z-10 mt-3">{slots.bottomContent}</div>}
          </div>
        </header>

        <div className="app-shell-body relative z-0 flex min-h-0 flex-1 flex-col">
          <main id="app-scroll-root" className="grain-bg relative min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3 sm:px-7 sm:pb-8">
            {children}
          </main>

          <BottomNav />
        </div>
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