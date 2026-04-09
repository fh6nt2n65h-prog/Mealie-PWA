import type { RecipeIngredient } from '@/types/mealie'

// US kitchen imperial → metric conversion factors
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  t: 15, // capital T is tablespoon in recipes, but we lowercase
  cup: 240,
  cups: 240,
  c: 240,
  'fl oz': 30,
  'fl. oz': 30,
  'fl. oz.': 30,
  'fluid oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
}

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.59,
  lbs: 453.59,
  pound: 453.59,
  pounds: 453.59,
}

// Kitchen-friendly rounding: 1 decimal below 10 ml, whole numbers otherwise
function kitchenRound(value: number, targetUnit: string): number {
  if (targetUnit === 'ml') {
    return value < 10 ? Math.round(value * 10) / 10 : Math.round(value)
  }
  return Math.round(value)
}

export type ConversionResult = {
  ingredients: RecipeIngredient[]
  convertedCount: number
  skippedCount: number
  skippedNames: string[]
}

export function convertIngredient(ingredient: RecipeIngredient): { ingredient: RecipeIngredient; converted: boolean } {
  const unitKey = (ingredient.unit?.abbreviation || ingredient.unit?.name || '').toLowerCase().trim()

  if (!unitKey || ingredient.quantity === null || ingredient.quantity === undefined) {
    return { ingredient: { ...ingredient }, converted: false }
  }

  const mlFactor = VOLUME_TO_ML[unitKey]
  if (mlFactor !== undefined) {
    const mlValue = kitchenRound(ingredient.quantity * mlFactor, 'ml')
    return {
      ingredient: {
        ...ingredient,
        quantity: mlValue,
        unit: { id: ingredient.unit?.id, name: 'milliliter', abbreviation: 'ml' },
      },
      converted: true,
    }
  }

  const gFactor = WEIGHT_TO_G[unitKey]
  if (gFactor !== undefined) {
    const gValue = kitchenRound(ingredient.quantity * gFactor, 'g')
    return {
      ingredient: {
        ...ingredient,
        quantity: gValue,
        unit: { id: ingredient.unit?.id, name: 'gram', abbreviation: 'g' },
      },
      converted: true,
    }
  }

  return { ingredient: { ...ingredient }, converted: false }
}

export function convertRecipeIngredients(ingredients: RecipeIngredient[]): ConversionResult {
  let convertedCount = 0
  let skippedCount = 0
  const skippedNames: string[] = []

  const converted = ingredients.map((ingredient) => {
    const result = convertIngredient(ingredient)

    if (result.converted) {
      convertedCount++
    } else if (ingredient.unit?.name || ingredient.unit?.abbreviation) {
      // Has a unit but we couldn't convert it — report as skipped
      skippedCount++
      const label = ingredient.food?.name || ingredient.display || ingredient.originalText || ''
      if (label) {
        skippedNames.push(label)
      }
    }

    return result.ingredient
  })

  return { ingredients: converted, convertedCount, skippedCount, skippedNames }
}

export function hasImperialIngredients(ingredients: RecipeIngredient[]): boolean {
  return ingredients.some((i) => {
    const unitKey = (i.unit?.abbreviation || i.unit?.name || '').toLowerCase().trim()
    return unitKey in VOLUME_TO_ML || unitKey in WEIGHT_TO_G
  })
}

// Matches patterns like: 350°F  350 °F  350F  350 degrees F  350 degrees Fahrenheit
const FAHRENHEIT_RE = /(\d+(?:\.\d+)?)\s*(?:°\s*F|degrees?\s+F(?:ahrenheit)?|°\s*Fahrenheit)\b/gi

function fToC(f: number): number {
  return Math.round((f - 32) * 5 / 9)
}

export type StepConversionResult = {
  steps: string[]
  convertedCount: number
}

export function convertTemperaturesInSteps(stepTexts: string[]): StepConversionResult {
  let convertedCount = 0

  const steps = stepTexts.map((text) => {
    let changed = false
    const result = text.replace(FAHRENHEIT_RE, (_match, deg: string) => {
      changed = true
      return `${fToC(parseFloat(deg))}°C`
    })
    if (changed) convertedCount++
    return result
  })

  return { steps, convertedCount }
}
