import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown01, CookingPot, ListPlus, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ParsedIngredientResult, Recipe, RecipeIngredient } from '@/types/mealie'
import { convertRecipeIngredients, hasImperialIngredients } from '@/lib/unit-converter'
import { useSettings } from '@/app/settings-context'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DialogSheet } from '@/components/dialog-sheet'
import { EmptyState } from '@/components/empty-state'
import { removeRecipeCacheEntry, upsertRecipeCacheEntry } from '@/lib/recipe-cache'
import { MealieApi } from '@/lib/mealie-api'
import { formatDuration, formatRelativeCookedDate, getRecipeImageUrl } from '@/lib/utils'

type EditableParsedIngredient = {
  raw: string
  quantity: string
  unit: string
  food: string
  note: string
}

function toEditableIngredient(raw: string, parsed?: ParsedIngredientResult | null): EditableParsedIngredient {
  return {
    raw,
    quantity: parsed?.quantity === null || parsed?.quantity === undefined ? '' : String(parsed.quantity),
    unit: parsed?.unit?.abbreviation || parsed?.unit?.name || '',
    food: parsed?.food?.name || '',
    note: parsed?.note || ''
  }
}

// ---------- recipe edit types ----------

type IngredientDraft = {
  quantity: string
  unit: string
  food: string
  note: string
  title: string
}

type StepDraft = {
  id?: string | null
  title: string
  text: string
}

type RecipeEditDraft = {
  name: string
  description: string
  prepTime: string
  cookTime: string
  totalTime: string
  recipeServings: string
  ingredients: IngredientDraft[]
  instructions: StepDraft[]
}

function recipeToEditDraft(r: Recipe): RecipeEditDraft {
  return {
    name: r.name || '',
    description: r.description || '',
    prepTime: r.prepTime || '',
    cookTime: r.cookTime || '',
    totalTime: r.totalTime || '',
    recipeServings: String(r.recipeServings || 1),
    ingredients: r.recipeIngredient.map((i) => ({
      quantity: i.quantity === null || i.quantity === undefined ? '' : String(i.quantity),
      unit: i.unit?.abbreviation || i.unit?.name || '',
      food: i.food?.name || '',
      note: i.note || '',
      title: i.title || '',
    })),
    instructions: (r.recipeInstructions || []).map((s) => ({
      id: s.id,
      title: s.title || '',
      text: s.text,
    })),
  }
}

const inputCls = 'w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none placeholder:text-oliveGray/60'

function scaleQuantity(quantity: number | null | undefined, scale: number) {
  if (quantity === null || quantity === undefined) {
    return null
  }

  return Math.round(quantity * scale * 100) / 100
}

export function RecipeDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [servings, setServings] = useState(1)
  const [cookMode, setCookMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [buttonsInView, setButtonsInView] = useState(true)
  const [listAddStatus, setListAddStatus] = useState<'idle' | 'adding' | 'done' | 'error'>('idle')
  const [parseSheetOpen, setParseSheetOpen] = useState(false)
  const [parseLoading, setParseLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parseSourceLabel, setParseSourceLabel] = useState('Ingredient')
  const [parseDraft, setParseDraft] = useState<EditableParsedIngredient>({ raw: '', quantity: '', unit: '', food: '', note: '' })

  // edit sheet
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState<RecipeEditDraft>({
    name: '', description: '', prepTime: '', cookTime: '', totalTime: '', recipeServings: '1', ingredients: [], instructions: [],
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [convertStatus, setConvertStatus] = useState<{ convertedCount: number; skippedCount: number; skippedNames: string[] } | null>(null)

  const buttonsRowRef = useRef<HTMLDivElement>(null)
  const ingredientLongPressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRecipe() {
      if (!slug || !settings.apiToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const api = new MealieApi(settings)
        const detail = await api.getRecipe(slug)

        if (!cancelled) {
          setRecipe(detail)
          setServings(detail.recipeServings || 1)
          upsertRecipeCacheEntry(settings, detail)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this recipe.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRecipe()

    return () => {
      cancelled = true
    }
  }, [settings, slug])

  useEffect(() => {
    const scrollRoot = document.getElementById('app-scroll-root')
    const el = buttonsRowRef.current

    if (!scrollRoot || !el) {
      return
    }

    function check() {
      const elBottom = el!.getBoundingClientRect().bottom
      const rootTop = scrollRoot!.getBoundingClientRect().top
      setButtonsInView(elBottom > rootTop)
    }

    check()
    scrollRoot.addEventListener('scroll', check, { passive: true })

    return () => scrollRoot.removeEventListener('scroll', check)
  }, [recipe])

  useEffect(() => {
    return () => {
      if (ingredientLongPressTimerRef.current !== null) {
        window.clearTimeout(ingredientLongPressTimerRef.current)
        ingredientLongPressTimerRef.current = null
      }
    }
  }, [])

  if (loading) {
    return <EmptyState title="Loading recipe" description="Gathering ingredients, method, and imagery from Mealie." />
  }

  if (error || !recipe) {
    return <EmptyState title="Recipe unavailable" description={error || 'This recipe could not be found.'} />
  }

  const image = getRecipeImageUrl(settings.baseUrl, recipe)

  async function handleAddToShoppingList() {
    if (!recipe?.id || listAddStatus === 'adding') {
      return
    }

    setListAddStatus('adding')

    try {
      const api = new MealieApi(settings)
      const lists = await api.getShoppingLists()
      let listId = lists.items[0]?.id

      if (!listId) {
        const created = await api.createShoppingList('Shopping List')
        listId = created.id
      }

      await api.addRecipeToShoppingList(listId, recipe.id)
      setListAddStatus('done')
      window.setTimeout(() => setListAddStatus('idle'), 1800)
    } catch {
      setListAddStatus('error')
      window.setTimeout(() => setListAddStatus('idle'), 2000)
    }
  }

  async function loadParsedIngredient(rawText: string) {
    const trimmed = rawText.trim()

    if (!trimmed || !settings.apiToken) {
      return
    }

    setParseLoading(true)
    setParseError('')

    try {
      const api = new MealieApi(settings)
      const parsed = await api.parseIngredient(trimmed)
      setParseDraft(toEditableIngredient(trimmed, parsed))
    } catch (parseLoadError) {
      setParseError(parseLoadError instanceof Error ? parseLoadError.message : 'Unable to parse this ingredient.')
    } finally {
      setParseLoading(false)
    }
  }

  function cancelIngredientLongPress() {
    if (ingredientLongPressTimerRef.current !== null) {
      window.clearTimeout(ingredientLongPressTimerRef.current)
      ingredientLongPressTimerRef.current = null
    }
  }

  function openIngredientParse(ingredient: RecipeIngredient) {
    const rawText = ingredient.display || ingredient.originalText || ingredient.food?.name || ''
    const sourceLabel = ingredient.food?.name || ingredient.display || ingredient.originalText || 'Ingredient'

    setParseSourceLabel(sourceLabel)
    setParseDraft({
      raw: rawText,
      quantity: ingredient.quantity === null || ingredient.quantity === undefined ? '' : String(ingredient.quantity),
      unit: ingredient.unit?.abbreviation || ingredient.unit?.name || '',
      food: ingredient.food?.name || '',
      note: ingredient.note || ''
    })
    setParseError('')
    setParseSheetOpen(true)
    void loadParsedIngredient(rawText)
  }

  function startIngredientLongPress(ingredient: RecipeIngredient) {
    cancelIngredientLongPress()
    ingredientLongPressTimerRef.current = window.setTimeout(() => {
      ingredientLongPressTimerRef.current = null
      openIngredientParse(ingredient)
    }, 500)
  }

  function openEditDialog() {
    if (!recipe) {
      return
    }

    setEditDraft(recipeToEditDraft(recipe))
    setEditError('')
    setConvertStatus(null)
    setEditOpen(true)
  }

  function setIngredientField(idx: number, field: keyof IngredientDraft, value: string) {
    setEditDraft((d) => {
      const next = [...d.ingredients]
      next[idx] = { ...next[idx]!, [field]: value }
      return { ...d, ingredients: next }
    })
  }

  function addIngredient() {
    setEditDraft((d) => ({ ...d, ingredients: [...d.ingredients, { quantity: '', unit: '', food: '', note: '', title: '' }] }))
  }

  function removeIngredient(idx: number) {
    setEditDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }))
  }

  function setStepField(idx: number, field: keyof StepDraft, value: string) {
    setEditDraft((d) => {
      const next = [...d.instructions]
      next[idx] = { ...next[idx]!, [field]: value }
      return { ...d, instructions: next }
    })
  }

  function addStep() {
    setEditDraft((d) => ({ ...d, instructions: [...d.instructions, { id: null, title: '', text: '' }] }))
  }

  function removeStep(idx: number) {
    setEditDraft((d) => ({ ...d, instructions: d.instructions.filter((_, i) => i !== idx) }))
  }

  function handleConvertDraftToMetric() {
    if (!recipe) return

    const asIngredients: RecipeIngredient[] = editDraft.ingredients.map((draft, idx) => {
      const original = recipe.recipeIngredient[idx]
      const qty = parseFloat(draft.quantity)
      return {
        ...original,
        quantity: draft.quantity && !isNaN(qty) ? qty : null,
        unit: draft.unit ? { id: original?.unit?.id ?? null, name: draft.unit, abbreviation: draft.unit } : null,
        food: draft.food ? { id: original?.food?.id ?? null, name: draft.food } : null,
      }
    })

    const result = convertRecipeIngredients(asIngredients)

    const newIngredients = editDraft.ingredients.map((draft, idx) => {
      const converted = result.ingredients[idx]
      if (!converted) return draft
      return {
        ...draft,
        quantity: converted.quantity === null || converted.quantity === undefined ? draft.quantity : String(converted.quantity),
        unit: converted.unit?.abbreviation || converted.unit?.name || draft.unit,
      }
    })

    setEditDraft((d) => ({ ...d, ingredients: newIngredients }))
    setConvertStatus({ convertedCount: result.convertedCount, skippedCount: result.skippedCount, skippedNames: result.skippedNames })
  }

  async function handleSaveEdit() {
    if (!recipe || editSaving) return

    setEditSaving(true)
    setEditError('')

    try {
      const api = new MealieApi(settings)
      const payload = {
        name: editDraft.name,
        description: editDraft.description || null,
        prepTime: editDraft.prepTime || null,
        cookTime: editDraft.cookTime || null,
        totalTime: editDraft.totalTime || null,
        recipeServings: parseInt(editDraft.recipeServings, 10) || 1,
        recipeIngredient: editDraft.ingredients.map((draft, idx) => {
          const original = recipe.recipeIngredient[idx]
          const qty = parseFloat(draft.quantity)
          return {
            ...original,
            quantity: draft.quantity && !isNaN(qty) ? qty : null,
            unit: draft.unit ? { id: original?.unit?.id ?? null, name: draft.unit, abbreviation: draft.unit } : null,
            food: draft.food ? { id: original?.food?.id ?? null, name: draft.food } : null,
            note: draft.note || null,
            title: draft.title || null,
          }
        }),
        recipeInstructions: editDraft.instructions.map((s) => ({
          id: s.id,
          title: s.title || null,
          summary: null,
          text: s.text,
        })),
      }
      const updated = await api.updateRecipe(recipe.slug, payload)
      setRecipe(updated)
      setServings(updated.recipeServings || 1)
      upsertRecipeCacheEntry(settings, updated)
      setEditOpen(false)
    } catch (saveErr) {
      setEditError(saveErr instanceof Error ? saveErr.message : 'Unable to save recipe changes.')
    } finally {
      setEditSaving(false)
    }
  }

  const draftHasImperial = Boolean(recipe) && editOpen && hasImperialIngredients(
    editDraft.ingredients.map((d, idx) => ({
      ...recipe!.recipeIngredient[idx],
      unit: d.unit ? { name: d.unit, abbreviation: d.unit } : null,
    }))
  )

  async function handleDeleteRecipe() {
    if (!recipe || deleting) {
      return
    }

    setConfirmDeleteOpen(false)
    setDeleting(true)
    setError('')

    try {
      const api = new MealieApi(settings)
      await api.deleteRecipe(recipe.slug)
      removeRecipeCacheEntry(settings, recipe.slug)
      navigate('/recipes', { replace: true })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this recipe.')
      setDeleting(false)
    }
  }

  return (
    <div className={`space-y-5 animate-rise ${cookMode ? 'pb-6' : ''}`}>
      {/* Sticky cook-mode shortcut — animates in when the buttons row scrolls out of view */}
      <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
        <div className="flex justify-end">
          <AnimatePresence initial={false}>
            {!buttonsInView && (
              <motion.button
                key="sticky-cook"
                type="button"
                onClick={() => setCookMode((c) => !c)}
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full shadow-paper ${
                  cookMode ? 'border border-taupe bg-cream text-ink' : 'bg-ink text-parchment'
                }`}
                aria-label={cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
              >
                <CookingPot className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Link to="/recipes" className="inline-flex items-center gap-2 text-sm font-semibold text-oliveGray">
        Back to recipes
      </Link>

      <section className="overflow-hidden rounded-card border border-taupe/70 bg-parchment shadow-paper">
        {image ? (
          <div className="bg-oat p-2 sm:p-3">
            <img src={image} alt={recipe.name || 'Recipe'} className="aspect-[4/5] w-full rounded-[1.65rem] object-cover sm:aspect-[5/4]" />
          </div>
        ) : null}

        <div className="space-y-5 px-5 py-5 sm:px-7">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-oliveGray">
              <span>{formatDuration(recipe.totalTime)}</span>
              <span>{recipe.recipeServings || 1} servings</span>
              {recipe.lastMade && <span>{formatRelativeCookedDate(recipe.lastMade)}</span>}
            </div>
            <h2 className="max-w-3xl font-display text-4xl leading-none tracking-[-0.04em] text-ink sm:text-5xl">{recipe.name || 'Untitled recipe'}</h2>
            <p className="max-w-2xl text-sm leading-7 text-oliveGray">{recipe.description || 'A recipe collected into your private cooking journal.'}</p>
          </div>

          <div ref={buttonsRowRef} className="flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-taupe bg-cream px-1.5 py-1 text-xs font-semibold text-ink">
              <span className="px-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-oliveGray">Servings</span>
              <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-ink">
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[2rem] text-center text-xs">{servings}</span>
              <button type="button" onClick={() => setServings((s) => Math.min(50, s + 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-ink">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCookMode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2.5 text-xs font-semibold text-parchment"
            >
              <CookingPot className="h-3.5 w-3.5" />
              {cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
            </button>
            <button
              type="button"
              onClick={openEditDialog}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-taupe bg-cream text-ink"
              aria-label="Edit recipe"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={deleting}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Delete recipe"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {error && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{error}</p>}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <article className="rounded-card border border-taupe/70 bg-oat/65 px-5 py-6 shadow-paper sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Ingredients</h3>
            {!cookMode && (
              <button
                type="button"
                onClick={() => void handleAddToShoppingList()}
                disabled={listAddStatus === 'adding'}
                className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-olive transition-opacity disabled:opacity-60"
                aria-label="Add all ingredients to shopping list"
              >
                {listAddStatus === 'done' && 'Added!'}
                {listAddStatus === 'error' && 'No list'}
                {(listAddStatus === 'idle' || listAddStatus === 'adding') && (
                  <><ListPlus className="h-3.5 w-3.5" />{listAddStatus === 'adding' ? 'Adding…' : 'Add all'}</>
                )}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-oliveGray">Long press an ingredient to parse and edit it.</p>
          <ul className="mt-4 space-y-3">
            {recipe.recipeIngredient.map((ingredient, index) => {
              const baseServings = recipe.recipeServings || 1
              const scaledValue = scaleQuantity(ingredient.quantity, servings / baseServings)

              return (
                <li
                  key={`${ingredient.food?.name || ingredient.display || 'ingredient'}-${index}`}
                  className="rounded-[1.2rem] bg-parchment px-4 py-2 shadow-paper"
                  onMouseDown={() => startIngredientLongPress(ingredient)}
                  onMouseUp={cancelIngredientLongPress}
                  onMouseLeave={cancelIngredientLongPress}
                  onTouchStart={() => startIngredientLongPress(ingredient)}
                  onTouchEnd={cancelIngredientLongPress}
                  onTouchCancel={cancelIngredientLongPress}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    openIngredientParse(ingredient)
                  }}
                >
                  <p className="text-sm font-semibold leading-snug text-ink">
                    {scaledValue !== null ? `${scaledValue} ` : ''}
                    {ingredient.unit?.abbreviation || ingredient.unit?.name ? `${ingredient.unit?.abbreviation || ingredient.unit?.name} ` : ''}
                    {ingredient.food?.name || ingredient.display || ingredient.originalText || 'Ingredient'}
                  </p>
                  {ingredient.note && <p className="mt-0 line-clamp-1 text-xs leading-4 text-oliveGray">{ingredient.note}</p>}
                </li>
              )
            })}
          </ul>
        </article>

        <article className={`rounded-card border border-taupe/70 px-5 py-6 shadow-paper sm:px-6 ${cookMode ? 'bg-parchment' : 'bg-parchment/95'}`}>
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Method</h3>
          <ol className="mt-5 space-y-5">
            {(recipe.recipeInstructions || []).map((step, index) => (
              <li key={step.id || `${index}`} className="grid gap-3 rounded-[1.4rem] bg-cream px-4 py-4 shadow-paper sm:grid-cols-[52px_1fr] sm:px-5 sm:py-5">
                <span className="font-display text-4xl leading-none text-terracotta">{index + 1}</span>
                <div>
                  {step.title && <h4 className="text-base font-semibold text-ink">{step.title}</h4>}
                  <p className={`mt-1 ${cookMode ? 'text-xl leading-9 text-ink' : 'text-sm leading-7 text-oliveGray'}`}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <DialogSheet
        open={parseSheetOpen}
        title="Parsed ingredient"
        description={parseSourceLabel}
        onClose={() => {
          if (!parseLoading) {
            setParseSheetOpen(false)
            setParseError('')
          }
        }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setParseSheetOpen(false)}
              disabled={parseLoading}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-oliveGray">Edit the parsed fields below. Changes stay in-app.</p>
            <button
              type="button"
              onClick={() => void loadParsedIngredient(parseDraft.raw)}
              disabled={parseLoading || !parseDraft.raw.trim()}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-cream px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {parseLoading ? 'Parsing…' : 'Re-parse'}
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-ink">Raw ingredient</span>
            <input
              value={parseDraft.raw}
              onChange={(event) => setParseDraft((current) => ({ ...current, raw: event.target.value }))}
              className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none"
              placeholder="2 cups flour"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Quantity</span>
              <input
                value={parseDraft.quantity}
                onChange={(event) => setParseDraft((current) => ({ ...current, quantity: event.target.value }))}
                className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none"
                placeholder="2"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Unit</span>
              <input
                value={parseDraft.unit}
                onChange={(event) => setParseDraft((current) => ({ ...current, unit: event.target.value }))}
                className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none"
                placeholder="cups"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-ink">Ingredient</span>
            <input
              value={parseDraft.food}
              onChange={(event) => setParseDraft((current) => ({ ...current, food: event.target.value }))}
              className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none"
              placeholder="all-purpose flour"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-ink">Note</span>
            <input
              value={parseDraft.note}
              onChange={(event) => setParseDraft((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none"
              placeholder="sifted"
            />
          </label>

          {parseError && <p className="rounded-[1.1rem] bg-terracotta/10 px-4 py-2.5 text-sm text-terracotta">{parseError}</p>}
        </div>
      </DialogSheet>

      {/* ── Recipe edit sheet ──────────────────────────────── */}
      <DialogSheet
        open={editOpen}
        title="Edit recipe"
        description={recipe.name || 'Untitled recipe'}
        onClose={() => { if (!editSaving) setEditOpen(false) }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditOpen(false)} disabled={editSaving}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={() => void handleSaveEdit()} disabled={editSaving}
              className="inline-flex items-center justify-center rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment disabled:cursor-not-allowed disabled:opacity-60">
              {editSaving ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Basic info</h4>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Title</span>
              <input value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} className={inputCls} placeholder="Recipe title" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Description</span>
              <textarea value={editDraft.description} onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))} rows={3} className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none placeholder:text-oliveGray/60" placeholder="A short description" />
            </label>
          </section>

          <section className="space-y-3">
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Time &amp; servings</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-ink">Prep</span>
                <input value={editDraft.prepTime} onChange={(e) => setEditDraft((d) => ({ ...d, prepTime: e.target.value }))} className={inputCls} placeholder="PT15M" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-ink">Cook</span>
                <input value={editDraft.cookTime} onChange={(e) => setEditDraft((d) => ({ ...d, cookTime: e.target.value }))} className={inputCls} placeholder="PT30M" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-ink">Total</span>
                <input value={editDraft.totalTime} onChange={(e) => setEditDraft((d) => ({ ...d, totalTime: e.target.value }))} className={inputCls} placeholder="PT45M" />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-ink">Servings</span>
              <input type="number" min="1" value={editDraft.recipeServings} onChange={(e) => setEditDraft((d) => ({ ...d, recipeServings: e.target.value }))} className={inputCls} placeholder="4" />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Ingredients</h4>
              {draftHasImperial && (
                <button type="button" onClick={handleConvertDraftToMetric}
                  className="inline-flex items-center gap-1.5 rounded-full border border-taupe bg-cream px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink">
                  <ArrowDown01 className="h-3.5 w-3.5" /> Convert to metric
                </button>
              )}
            </div>
            {convertStatus && (
              <p className="rounded-[1.1rem] bg-sage/15 px-3.5 py-2.5 text-xs leading-5 text-olive">
                {convertStatus.convertedCount} ingredient{convertStatus.convertedCount !== 1 ? 's' : ''} converted.
                {convertStatus.skippedCount > 0 && ` ${convertStatus.skippedCount} skipped: ${convertStatus.skippedNames.slice(0, 3).join(', ')}${convertStatus.skippedNames.length > 3 ? '…' : ''}.`}
              </p>
            )}
            <ul className="space-y-3">
              {editDraft.ingredients.map((draft, idx) => (
                <li key={idx} className="rounded-[1.2rem] border border-taupe/60 bg-oat/40 px-4 py-3 space-y-2">
                  <div className="grid grid-cols-[6rem_1fr] gap-2">
                    <input value={draft.quantity} onChange={(e) => setIngredientField(idx, 'quantity', e.target.value)} className={inputCls} placeholder="Qty" />
                    <input value={draft.unit} onChange={(e) => setIngredientField(idx, 'unit', e.target.value)} className={inputCls} placeholder="Unit" />
                  </div>
                  <input value={draft.food} onChange={(e) => setIngredientField(idx, 'food', e.target.value)} className={inputCls} placeholder="Ingredient name" />
                  <div className="flex items-center gap-2">
                    <input value={draft.note} onChange={(e) => setIngredientField(idx, 'note', e.target.value)} className={`${inputCls} flex-1`} placeholder="Note (optional)" />
                    <button type="button" onClick={() => removeIngredient(idx)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta text-xs font-bold">×</button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addIngredient}
              className="inline-flex items-center gap-2 rounded-full border border-taupe bg-cream px-4 py-2 text-sm font-semibold text-ink">
              <Plus className="h-3.5 w-3.5" /> Add ingredient
            </button>
          </section>

          <section className="space-y-3">
            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Instructions</h4>
            <ol className="space-y-3">
              {editDraft.instructions.map((step, idx) => (
                <li key={idx} className="rounded-[1.2rem] border border-taupe/60 bg-oat/40 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl text-terracotta">{idx + 1}</span>
                    <input value={step.title} onChange={(e) => setStepField(idx, 'title', e.target.value)} className={`${inputCls} flex-1`} placeholder="Step title (optional)" />
                    <button type="button" onClick={() => removeStep(idx)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta text-xs font-bold">×</button>
                  </div>
                  <textarea value={step.text} onChange={(e) => setStepField(idx, 'text', e.target.value)} rows={3}
                    className="w-full rounded-[1.1rem] border border-taupe bg-cream px-4 py-2.5 text-sm text-ink outline-none placeholder:text-oliveGray/60"
                    placeholder="Describe this step…" />
                </li>
              ))}
            </ol>
            <button type="button" onClick={addStep}
              className="inline-flex items-center gap-2 rounded-full border border-taupe bg-cream px-4 py-2 text-sm font-semibold text-ink">
              <Plus className="h-3.5 w-3.5" /> Add step
            </button>
          </section>

          {editError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{editError}</p>}
        </div>
      </DialogSheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete recipe"
        description={`Delete ${recipe.name || 'this recipe'} from Mealie?`}
        confirmLabel="Delete recipe"
        busy={deleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteRecipe()}
      />
    </div>
  )
}