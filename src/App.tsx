import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { MealPlanPage } from '@/pages/meal-plan-page'
import { RecipeDetailPage } from '@/pages/recipe-detail-page'
import { RecipesPage } from '@/pages/recipes-page'
import { SettingsPage } from '@/pages/settings-page'
import { ShoppingListPage } from '@/pages/shopping-list-page'

const TAB_ROUTES = ['/recipes', '/meal-plan', '/shopping-list', '/settings']

function getTabIndex(pathname: string) {
  return TAB_ROUTES.indexOf(pathname)
}

export default function App() {
  const location = useLocation()
  const previousPathRef = useRef(location.pathname)
  const currentTabIndex = getTabIndex(location.pathname)
  const previousTabIndex = getTabIndex(previousPathRef.current)
  const direction = currentTabIndex >= 0 && previousTabIndex >= 0 && currentTabIndex !== previousTabIndex
    ? currentTabIndex > previousTabIndex ? 1 : -1
    : 0

  useEffect(() => {
    previousPathRef.current = location.pathname
  }, [location.pathname])

  return (
    <AppShell>
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={location.pathname}
          className="h-full"
          custom={direction}
          initial={(currentDirection) => ({ x: currentDirection === 0 ? 0 : currentDirection > 0 ? 34 : -34 })}
          animate={{ x: 0 }}
          exit={(currentDirection) => ({ x: currentDirection === 0 ? 0 : currentDirection > 0 ? -34 : 34 })}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
            <Route path="/meal-plan" element={<MealPlanPage />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}