export type ApiSettings = {
  baseUrl: string
  apiToken: string
}

export type ViewMode = 'grid' | 'swipe'

export type MealPlanDensity = 'compact'

export type Pagination<T> = {
  items: T[]
  page?: number
  total?: number
  total_pages?: number
}

export type RecipeTag = {
  id?: string | null
  name: string
  slug: string
}

export type RecipeCategory = {
  id?: string | null
  name: string
  slug: string
}

export type RecipeTool = {
  id?: string | null
  name: string
  slug: string
}

export type IngredientUnit = {
  id?: string | null
  name: string
  abbreviation?: string | null
}

export type IngredientFood = {
  id?: string | null
  name: string
}

export type RecipeIngredient = {
  quantity?: number | null
  unit?: IngredientUnit | null
  food?: IngredientFood | null
  note?: string | null
  display?: string
  title?: string | null
  originalText?: string | null
}

export type RecipeStep = {
  id?: string | null
  title?: string | null
  summary?: string | null
  text: string
}

export type RecipeSummary = {
  id?: string | null
  userId?: string | null
  groupId?: string | null
  householdId?: string | null
  name?: string | null
  slug: string
  description?: string | null
  totalTime?: string | null
  prepTime?: string | null
  cookTime?: string | null
  recipeServings?: number
  recipeYield?: string | null
  recipeCategory?: RecipeCategory[] | null
  tags?: RecipeTag[] | null
  tools?: RecipeTool[]
  rating?: number | null
  lastMade?: string | null
  image?: unknown
}

export type Recipe = RecipeSummary & {
  recipeIngredient: RecipeIngredient[]
  recipeInstructions?: RecipeStep[] | null
  orgURL?: string | null
}

export type UpdateRecipeInput = {
  name?: string | null
  description?: string | null
  prepTime?: string | null
  cookTime?: string | null
  totalTime?: string | null
  recipeServings?: number
  recipeIngredient?: RecipeIngredient[]
  recipeInstructions?: RecipeStep[] | null
}

export type CreateRecipeInput = {
  name: string
}

export type PlanEntryType = 'breakfast' | 'lunch' | 'dinner' | 'side' | 'snack' | 'drink' | 'dessert'

export type MealPlanEntry = {
  id: number
  date: string
  entryType: PlanEntryType
  groupId: string
  userId: string
  householdId?: string
  title?: string
  text?: string
  recipeId?: string | null
  recipe?: RecipeSummary | null
}

export type CreateMealPlanEntryInput = {
  date: string
  entryType: PlanEntryType
  title?: string
  text?: string
  recipeId?: string | null
}

export type UpdateMealPlanEntryInput = CreateMealPlanEntryInput & {
  id: number
  groupId: string
  userId: string
}

export type MultiPurposeLabel = {
  id: string
  name: string
  color?: string
}

export type ShoppingListItemRecipeRef = {
  id: string
  recipeId: string
  recipeQuantity?: number
}

export type ShoppingListItem = {
  id: string
  shoppingListId: string
  checked: boolean
  quantity?: number
  note?: string | null
  display?: string
  food?: IngredientFood | null
  foodId?: string | null
  unit?: IngredientUnit | null
  unitId?: string | null
  label?: MultiPurposeLabel | null
  labelId?: string | null
  position?: number
  recipeReferences?: ShoppingListItemRecipeRef[]
}

export type ShoppingListSummary = {
  id: string
  name?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

export type ShoppingList = ShoppingListSummary & {
  listItems: ShoppingListItem[]
}

export type UserProfile = {
  id: string
  fullName?: string | null
  username?: string | null
  group?: string
  household?: string
}

export type ApiErrorPayload = {
  detail?: Array<{
    msg?: string
  }> | string
}