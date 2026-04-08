import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { CreateMealPlanEntryInput, MealPlanDensity, MealPlanEntry, PlanEntryType, RecipeSummary, UpdateMealPlanEntryInput } from '@/types/mealie'
import { useHeaderSlots } from '@/app/header-slots-context'
import { useSettings } from '@/app/settings-context'
import { DialogSheet } from '@/components/dialog-sheet'
import { EmptyState } from '@/components/empty-state'
import { SearchField } from '@/components/search-field'
import { useStoredState } from '@/hooks/use-stored-state'
import { getRecipeCache } from '@/lib/recipe-cache'
import { MealieApi } from '@/lib/mealie-api'
import { loadMealPlanDensity, saveMealPlanDensity } from '@/lib/storage'
import { formatDayLabel, formatSectionDate } from '@/lib/utils'

const MEAL_TYPES: PlanEntryType[] = ['breakfast', 'lunch', 'dinner']

type MealPlanDraft = {
  id: number | null
  date: string
  entryType: PlanEntryType
  recipeId: string
  title: string
  text: string
  mode: 'recipe' | 'note'
  groupId: string
  userId: string
}

function titleize(entryType: PlanEntryType) {
  return entryType.charAt(0).toUpperCase() + entryType.slice(1)
}

function buildCalendarDays() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = dayjs().add(index, 'day')

    return {
      key: date.format('YYYY-MM-DD'),
      label: formatDayLabel(date.format('YYYY-MM-DD')),
      date
    }
  })
}

const CALENDAR_DAYS = buildCalendarDays()

function createDraft(date: string, entryType: PlanEntryType): MealPlanDraft {
  return {
    id: null,
    date,
    entryType,
    recipeId: '',
    title: '',
    text: '',
    mode: 'recipe',
    groupId: '',
    userId: ''
  }
}

export function MealPlanPage() {
  const { settings } = useSettings()
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [density] = useStoredState<MealPlanDensity>(loadMealPlanDensity, saveMealPlanDensity)
  const [selectedDayKey, setSelectedDayKey] = useState(CALENDAR_DAYS[0]?.key || dayjs().format('YYYY-MM-DD'))
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<MealPlanDraft>(createDraft(CALENDAR_DAYS[0]?.key || dayjs().format('YYYY-MM-DD'), 'dinner'))
  const [editorError, setEditorError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [recipeOptions, setRecipeOptions] = useState<RecipeSummary[]>([])
  const [recipeSearch, setRecipeSearch] = useState('')
  const [loadingRecipeOptions, setLoadingRecipeOptions] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const daySectionsRef = useRef<Record<string, HTMLElement | null>>({})
  const touchStartRef = useRef<number | null>(null)
  const calendarDays = CALENDAR_DAYS

  async function loadMealPlan(options?: { background?: boolean }) {
    if (!settings.apiToken) {
      setEntries([])
      setLoading(false)
      return
    }

    if (options?.background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const api = new MealieApi(settings)
      const startDate = calendarDays[0]?.key || dayjs().format('YYYY-MM-DD')
      const endDate = calendarDays[calendarDays.length - 1]?.key || startDate
      const response = await api.getMealPlan(startDate, endDate)

      setEntries(response.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load meal plan entries.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function ensureRecipeOptions() {
    if (recipeOptions.length > 0 || loadingRecipeOptions || !settings.apiToken) {
      return
    }

    const cached = getRecipeCache(settings)

    if (cached?.recipes.length) {
      setRecipeOptions(cached.recipes)
      return
    }

    setLoadingRecipeOptions(true)

    try {
      const api = new MealieApi(settings)
      const response = await api.getRecipes()
      setRecipeOptions(response.items)
    } catch {
      setRecipeOptions([])
    } finally {
      setLoadingRecipeOptions(false)
    }
  }

  useEffect(() => {
    void loadMealPlan()
  }, [settings.apiToken, settings.baseUrl])

  const entriesByDate = new Map<string, MealPlanEntry[]>()

  entries.forEach((entry) => {
    const dayEntries = entriesByDate.get(entry.date) || []
    dayEntries.push(entry)
    entriesByDate.set(entry.date, dayEntries)
  })

  const visibleDays = calendarDays.filter((day) => {
    if (density === 'advanced') {
      return true
    }

    const dayEntries = entriesByDate.get(day.key) || []
    return dayEntries.length > 0
  })

  const filteredRecipeOptions = useMemo(() => {
    const normalizedQuery = recipeSearch.trim().toLowerCase()

    return recipeOptions
      .filter((recipe) => {
        if (!normalizedQuery) {
          return true
        }

        return (recipe.name || '').toLowerCase().includes(normalizedQuery)
      })
      .slice(0, 12)
  }, [recipeOptions, recipeSearch])

  function jumpToDay(dayKey: string) {
    setSelectedDayKey(dayKey)

    const container = getScrollRoot()
    const target = daySectionsRef.current[dayKey]

    if (!container || !target) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop = container.scrollTop + targetRect.top - containerRect.top - 12

    container.scrollTo({ top: nextTop, behavior: 'smooth' })
  }

  function getScrollRoot() {
    if (typeof document === 'undefined') {
      return null
    }

    return document.getElementById('app-scroll-root')
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const scrollRoot = getScrollRoot()

    if (scrollRoot && scrollRoot.scrollTop <= 0 && !refreshing) {
      touchStartRef.current = event.touches[0]?.clientY || null
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

    const delta = (event.touches[0]?.clientY || 0) - touchStartRef.current

    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.45, 96))
    }
  }

  function handleTouchEnd() {
    const shouldRefresh = pullDistance >= 56
    touchStartRef.current = null
    setPullDistance(0)

    if (shouldRefresh) {
      void loadMealPlan({ background: true })
    }
  }

  function openCreateDialog(dayKey: string, entryType: PlanEntryType) {
    setDraft(createDraft(dayKey, entryType))
    setRecipeSearch('')
    setEditorError('')
    setEditorOpen(true)
    void ensureRecipeOptions()
  }

  function openEditDialog(entry: MealPlanEntry) {
    setDraft({
      id: entry.id,
      date: entry.date,
      entryType: entry.entryType,
      recipeId: entry.recipeId || '',
      title: entry.title || entry.recipe?.name || '',
      text: entry.text || '',
      mode: entry.recipeId ? 'recipe' : 'note',
      groupId: entry.groupId,
      userId: entry.userId
    })
    setRecipeSearch(entry.recipe?.name || '')
    setEditorError('')
    setEditorOpen(true)
    void ensureRecipeOptions()
  }

  async function handleSaveEntry() {
    if (!settings.apiToken || submitting) {
      return
    }

    if (draft.mode === 'recipe' && !draft.recipeId) {
      setEditorError('Choose a recipe for this meal slot before saving.')
      return
    }

    if (draft.mode === 'note' && !draft.title.trim()) {
      setEditorError('Add a title for the meal note before saving.')
      return
    }

    setSubmitting(true)
    setEditorError('')

    try {
      const api = new MealieApi(settings)
      const payload: CreateMealPlanEntryInput = {
        date: draft.date,
        entryType: draft.entryType,
        recipeId: draft.mode === 'recipe' ? draft.recipeId : null,
        title: draft.mode === 'note' ? draft.title.trim() : '',
        text: draft.text.trim()
      }

      if (draft.id === null) {
        await api.createMealPlanEntry(payload)
      } else {
        const updatePayload: UpdateMealPlanEntryInput = {
          ...payload,
          id: draft.id,
          groupId: draft.groupId,
          userId: draft.userId
        }

        await api.updateMealPlanEntry(draft.id, updatePayload)
      }

      setEditorOpen(false)
      await loadMealPlan({ background: true })
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : 'Unable to save that meal plan change.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteEntry(entryId: number) {
    if (!settings.apiToken || deletingId === entryId) {
      return
    }

    const confirmed = window.confirm('Delete this meal plan entry?')

    if (!confirmed) {
      return
    }

    setDeletingId(entryId)

    try {
      const api = new MealieApi(settings)
      await api.deleteMealPlanEntry(entryId)
      await loadMealPlan({ background: true })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete that meal plan entry.')
    } finally {
      setDeletingId(null)
    }
  }

  useHeaderSlots({
    bottomContent: settings.apiToken ? (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {calendarDays.map((day) => {
          const hasEntries = (entriesByDate.get(day.key) || []).length > 0
          const isSelected = day.key === selectedDayKey

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => jumpToDay(day.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition-colors sm:px-4 sm:py-2 ${isSelected ? 'border-ink bg-ink text-parchment' : hasEntries ? 'border-sage/60 bg-sage/15 text-olive' : 'border-taupe bg-cream text-oliveGray'}`}
            >
              {day.label}
            </button>
          )
        })}
      </div>
    ) : undefined
  })

  return (
    <>
      <div className="space-y-5 animate-rise" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="sticky top-0 z-10 flex h-0 justify-center overflow-visible pointer-events-none" aria-hidden="true">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-oat/90 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-oliveGray shadow-paper transition-transform duration-200"
            style={{ transform: `translateY(${refreshing || pullDistance ? 10 : -70}px)` }}
          >
            {refreshing ? 'Refreshing' : 'Pull to refresh'}
          </div>
        </div>

        {loading && <EmptyState title="Loading the plan" description="Collecting meal entries for the next two weeks." />}
        {!loading && error && <EmptyState title="Meal plan unavailable" description={error} />}
        {!loading && !error && visibleDays.length === 0 && (
          <EmptyState title="Nothing planned yet" description="Switch to advanced mode to see empty days, or start planning in Mealie and refresh this view." />
        )}

        {!loading && !error && visibleDays.length > 0 && (
          <div className="space-y-4">
            {visibleDays.map((day) => {
              const dayEntries = entriesByDate.get(day.key) || []

              return (
                <section
                  key={day.key}
                  ref={(node) => {
                    daySectionsRef.current[day.key] = node
                  }}
                  className="rounded-card border border-taupe/70 bg-parchment px-5 py-5 shadow-paper sm:px-6"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-b-taupe/60 pb-4">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{day.label}</p>
                      <h3 className="mt-1 font-display text-3xl tracking-[-0.03em] text-ink">{formatSectionDate(day.key)}</h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {MEAL_TYPES.map((mealType) => {
                      const mealEntries = dayEntries.filter((entry) => entry.entryType === mealType)

                      if (density === 'compact' && mealEntries.length === 0) {
                        return null
                      }

                      return (
                        <article key={`${day.key}-${mealType}`} className="rounded-[1.4rem] bg-cream px-4 py-4 shadow-paper">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{titleize(mealType)}</p>
                            <button
                              type="button"
                              onClick={() => openCreateDialog(day.key, mealType)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-taupe bg-parchment text-ink"
                              aria-label={`Add ${mealType} entry`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {mealEntries.length === 0 ? (
                            <p className="mt-3 text-sm text-oliveGray">Empty</p>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {mealEntries.map((entry) => (
                                <li key={entry.id} className="rounded-[1rem] bg-parchment px-4 py-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-display text-2xl tracking-[-0.03em] text-ink">{entry.recipe?.name || entry.title || 'Planned item'}</p>
                                      <p className="mt-1 text-sm leading-6 text-oliveGray">{entry.text || entry.recipe?.description || 'Planned from your Mealie household.'}</p>
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEditDialog(entry)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-taupe bg-cream text-ink"
                                        aria-label="Edit meal plan entry"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteEntry(entry.id)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta"
                                        aria-label="Delete meal plan entry"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {deletingId === entry.id && <p className="mt-3 text-sm text-oliveGray">Deleting…</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <DialogSheet
        open={editorOpen}
        title={draft.id === null ? 'Add meal plan entry' : 'Edit meal plan entry'}
        description="Create a recipe-backed meal slot or a quick freeform note for the day."
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
          }
        }}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEntry()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment"
            >
              {submitting ? 'Saving…' : 'Save entry'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Date</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Meal type</span>
              <select
                value={draft.entryType}
                onChange={(event) => setDraft((current) => ({ ...current, entryType: event.target.value as PlanEntryType }))}
                className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
              >
                {MEAL_TYPES.map((mealType) => (
                  <option key={mealType} value={mealType}>
                    {titleize(mealType)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, mode: 'recipe', title: '' }))}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${draft.mode === 'recipe' ? 'bg-ink text-parchment' : 'border border-taupe bg-cream text-ink'}`}
            >
              Recipe
            </button>
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, mode: 'note', recipeId: '' }))}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${draft.mode === 'note' ? 'bg-ink text-parchment' : 'border border-taupe bg-cream text-ink'}`}
            >
              Note
            </button>
          </div>

          {draft.mode === 'recipe' ? (
            <div className="space-y-3">
              <SearchField value={recipeSearch} onChange={setRecipeSearch} placeholder="Find a recipe for this slot" />
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-[1.4rem] bg-oat/50 p-3">
                {loadingRecipeOptions && <p className="px-2 py-3 text-sm text-oliveGray">Loading recipes…</p>}

                {!loadingRecipeOptions && filteredRecipeOptions.length === 0 && <p className="px-2 py-3 text-sm text-oliveGray">No matching recipes.</p>}

                {filteredRecipeOptions.map((recipe) => {
                  const selected = recipe.id === draft.recipeId

                  return (
                    <button
                      key={recipe.id || recipe.slug}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, recipeId: recipe.id || '', title: recipe.name || '' }))}
                      className={`w-full rounded-[1.1rem] px-4 py-3 text-left ${selected ? 'bg-ink text-parchment' : 'bg-parchment text-ink'}`}
                    >
                      <p className="font-semibold">{recipe.name || 'Untitled recipe'}</p>
                      {recipe.description && <p className={`mt-1 text-sm leading-6 ${selected ? 'text-parchment/80' : 'text-oliveGray'}`}>{recipe.description}</p>}
                    </button>
                  )
                })}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Optional note</span>
                <textarea
                  value={draft.text}
                  onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                  rows={3}
                  className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
                  placeholder="Add a short note for this meal slot"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Leftovers night"
                  className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Details</span>
                <textarea
                  value={draft.text}
                  onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                  rows={4}
                  placeholder="What are you planning?"
                  className="w-full rounded-[1.25rem] border border-taupe bg-cream px-4 py-3 text-sm text-ink outline-none"
                />
              </label>
            </div>
          )}

          {editorError && <p className="rounded-[1.2rem] bg-terracotta/10 px-4 py-3 text-sm leading-6 text-terracotta">{editorError}</p>}
        </div>
      </DialogSheet>
    </>
  )
}