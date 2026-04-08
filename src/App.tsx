import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { MealPlanPage } from '@/pages/meal-plan-page'
import { RecipeDetailPage } from '@/pages/recipe-detail-page'
import { RecipesPage } from '@/pages/recipes-page'
import { SettingsPage } from '@/pages/settings-page'
import { ShoppingListPage } from '@/pages/shopping-list-page'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        <Route path="/meal-plan" element={<MealPlanPage />} />
        <Route path="/shopping-list" element={<ShoppingListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  )
}