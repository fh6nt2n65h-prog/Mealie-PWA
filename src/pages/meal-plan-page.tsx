import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import type { MealPlanDensity, MealPlanEntry, PlanEntryType } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { EmptyState } from '@/components/empty-state'
import { loadMealPlanDensity, saveMealPlanDensity } from '@/lib/storage'
import { MealieApi } from '@/lib/mealie-api'
import { formatDayLabel, formatSectionDate } from '@/lib/utils'
import { useStoredState } from '@/hooks/use-stored-state'

const MEAL_TYPES: PlanEntryType[] = ['breakfast', 'lunch', 'dinner']

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

export function MealPlanPage() {
  const { settings } = useSettings()
  const [entries, setEntries] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [density, setDensity] = useStoredState<MealPlanDensity>(loadMealPlanDensity, saveMealPlanDensity)
  const [selectedDayKey, setSelectedDayKey] = useState(CALENDAR_DAYS[0]?.key || dayjs().format('YYYY-MM-DD'))
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const daySectionsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const calendarDays = CALENDAR_DAYS

  useEffect(() => {
    let cancelled = false

    async function loadMealPlan() {
      if (!settings.apiToken) {
        setEntries([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const api = new MealieApi(settings)
        const startDate = calendarDays[0]?.key || dayjs().format('YYYY-MM-DD')
        const endDate = calendarDays[calendarDays.length - 1]?.key || startDate
        const response = await api.getMealPlan(startDate, endDate)

        if (!cancelled) {
          setEntries(response.items)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load meal plan entries.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMealPlan()

    return () => {
      cancelled = true
    }
  }, [settings])

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

  function jumpToDay(dayKey: string) {
    setSelectedDayKey(dayKey)

    const container = scrollContainerRef.current
    const target = daySectionsRef.current[dayKey]

    if (!container || !target) {
      return
    }

    container.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5 animate-rise">
      <section className="rounded-card border border-taupe/70 bg-parchment px-4 py-4 shadow-paper sm:px-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {calendarDays.map((day) => {
            const hasEntries = (entriesByDate.get(day.key) || []).length > 0
            const isSelected = day.key === selectedDayKey

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => jumpToDay(day.key)}
                className={`shrink-0 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${isSelected ? 'border-ink bg-ink text-parchment' : hasEntries ? 'border-sage/60 bg-sage/15 text-olive' : 'border-taupe bg-cream text-oliveGray'}`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </section>

      {loading && <EmptyState title="Loading the plan" description="Collecting meal entries for the next two weeks." />}
      {!loading && error && <EmptyState title="Meal plan unavailable" description={error} />}
      {!loading && !error && visibleDays.length === 0 && (
        <EmptyState title="Nothing planned yet" description="Switch to advanced mode to see empty days, or start planning in Mealie and refresh this view." />
      )}

      {!loading && !error && visibleDays.length > 0 && (
        <div ref={scrollContainerRef} className="space-y-4">
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
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{titleize(mealType)}</p>

                        {mealEntries.length === 0 ? (
                          <p className="mt-3 text-sm text-oliveGray">Empty</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {mealEntries.map((entry) => (
                              <li key={entry.id} className="rounded-[1rem] bg-parchment px-4 py-3">
                                <p className="font-display text-2xl tracking-[-0.03em] text-ink">{entry.recipe?.name || entry.title || 'Planned item'}</p>
                                <p className="mt-1 text-sm leading-6 text-oliveGray">{entry.text || entry.recipe?.description || 'Planned from your Mealie household.'}</p>
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
  )
}