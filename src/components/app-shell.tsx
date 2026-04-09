import dayjs from 'dayjs'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { HeaderSlotsProvider, useHeaderSlotState } from '@/app/header-slots-context'
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-halo bg-[length:100%_100%]">
      <div className="app-shell-frame flex h-full flex-col overflow-hidden bg-cream/95">
        <header className="safe-top border-b border-b-taupe/70 bg-wash px-5 pb-3 pt-4 sm:px-7 sm:pb-4 sm:pt-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1 max-w-[32rem] animate-rise">
              <p className="truncate whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">{dayjs().format('dddd, MMMM D')}</p>
              <h1 className="mt-2 font-display text-[2.35rem] leading-none tracking-[-0.03em] text-ink sm:text-[3.25rem]">{resolveTitle(location.pathname)}</h1>
            </div>
            {slots.sideContent && <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 self-end">{slots.sideContent}</div>}
          </div>

          {slots.bottomContent && <div className="mt-3">{slots.bottomContent}</div>}
        </header>

        <div className="app-shell-body flex min-h-0 flex-1 flex-col">
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