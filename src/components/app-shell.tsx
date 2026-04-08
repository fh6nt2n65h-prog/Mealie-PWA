import dayjs from 'dayjs'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
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

function resolveSubtitle(pathname: string) {
  if (pathname.startsWith('/recipes/')) {
    return 'Compose yourself into cook mode.'
  }

  return null
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[880px] flex-col overflow-hidden bg-halo bg-[length:100%_100%] px-3 pb-2 pt-3 sm:px-5 sm:pt-5">
      <div className="flex h-full flex-col overflow-hidden rounded-shell border border-taupe/70 bg-cream/95 shadow-paper ring-1 ring-white/70 backdrop-blur-sm">
        <header className="safe-top border-b border-b-taupe/70 bg-wash px-5 pb-5 pt-5 sm:px-7 sm:pt-7">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-[32rem] animate-rise">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-oliveGray">{dayjs().format('dddd, MMMM D')}</p>
              <h1 className="mt-3 font-display text-4xl leading-none tracking-[-0.03em] text-ink sm:text-5xl">{resolveTitle(location.pathname)}</h1>
              {resolveSubtitle(location.pathname) && <p className="mt-3 max-w-xl text-sm leading-6 text-oliveGray sm:text-base">{resolveSubtitle(location.pathname)}</p>}
            </div>
            <div className="hidden h-16 w-16 rounded-full border border-taupe/70 bg-parchment shadow-paper sm:block" />
          </div>
        </header>

        <main id="app-scroll-root" className="grain-bg flex-1 overflow-y-auto px-5 pb-6 pt-4 sm:px-7 sm:pb-8">{children}</main>

        <BottomNav />
      </div>
    </div>
  )
}