import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Download, Trash2 } from 'lucide-react'
import type { ShoppingList, ShoppingListItem, ShoppingListSummary } from '@/types/mealie'
import { useHeaderSlots } from '@/app/header-slots-context'
import { useSettings } from '@/app/settings-context'
import { EmptyState } from '@/components/empty-state'
import { ShoppingItemRow } from '@/components/shopping-item-row'
import { MealieApi } from '@/lib/mealie-api'
import { clearAddedRecipes } from '@/lib/storage'
import { buildRemindersShortcutUrl } from '@/lib/utils'

function resolveActiveList(lists: ShoppingListSummary[]) {
  return [...lists].sort((left, right) => {
    const leftDate = left.updatedAt || left.createdAt || ''
    const rightDate = right.updatedAt || right.createdAt || ''
    return rightDate.localeCompare(leftDate)
  })[0]
}

export function ShoppingListPage() {
  const { settings } = useSettings()
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearingAll, setClearingAll] = useState(false)
  const clearPulseControls = useAnimationControls()

  useEffect(() => {
    let cancelled = false

    async function loadShoppingList() {
      if (!settings.apiToken) {
        setLoading(false)
        setShoppingList(null)
        setItems([])
        return
      }

      setLoading(true)
      setError('')

      try {
        const api = new MealieApi(settings)
        const lists = await api.getShoppingLists()
        const activeList = resolveActiveList(lists.items)

        if (!activeList) {
          if (!cancelled) {
            setShoppingList(null)
            setItems([])
          }
          return
        }

        const detail = await api.getShoppingList(activeList.id)

        if (!cancelled) {
          setShoppingList(detail)
          setItems(detail.listItems)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load shopping lists.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadShoppingList()

    return () => {
      cancelled = true
    }
  }, [settings])

  function handleExport() {
    if (items.length === 0) return
    const url = buildRemindersShortcutUrl(items)
    if (!url.endsWith('text=')) {
      window.location.href = url
    }
  }

  async function handleDeleteItem(item: ShoppingListItem) {
    setItems((current) => current.filter((i) => i.id !== item.id))
    try {
      const api = new MealieApi(settings)
      await api.deleteShoppingItem(item.id)
    } catch {
      setItems((current) => [...current, item])
      setError('Unable to remove that item.')
    }
  }

  async function handleClearAll() {
    if (clearingAll) return
    const toDelete = [...items]
    if (toDelete.length === 0) return

    setClearingAll(true)
    setItems([])

    const api = new MealieApi(settings)
    const results = await Promise.allSettled(
      toDelete.map((item) => api.deleteShoppingItem(item.id))
    )

    const failedIds = new Set(
      toDelete
        .filter((_, i) => results[i]?.status === 'rejected')
        .map((item) => item.id)
    )

    const remaining = toDelete.filter((item) => failedIds.has(item.id))
    setItems(remaining)

    if (remaining.length === 0) {
      clearAddedRecipes(settings)
    } else {
      setError(`${failedIds.size} item${failedIds.size !== 1 ? 's' : ''} could not be removed.`)
      setClearingAll(false)
    }
  }

  useHeaderSlots({
    sideContent: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={items.length === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-oliveGray disabled:opacity-40"
          aria-label="Export to Reminders"
        >
          <Download className="h-4 w-4" />
        </button>

        <AnimatePresence initial={false}>
          {(items.length > 0 || clearingAll) && (
            <motion.button
              layout
              type="button"
              onClick={() => {
                if (items.length === 0 || clearingAll) {
                  return
                }

                clearPulseControls.set({ scale: 1, rotate: 0 })
                void clearPulseControls.start({
                  scale: [1, 1.24, 0.92, 1],
                  rotate: [0, -8, 5, 0],
                  transition: { duration: 0.24, times: [0, 0.34, 0.68, 1] }
                })
                void handleClearAll()
              }}
              disabled={clearingAll}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-terracotta disabled:opacity-60"
              aria-label="Clear all items"
            >
              <motion.span animate={clearPulseControls} className="inline-flex">
                <Trash2 className="h-4 w-4" />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    ),
  })

  return (
    <div className="space-y-5 animate-rise">
      {loading && <EmptyState title="Loading the list" description="Pulling your most recently updated shopping list from Mealie." />}
      {!loading && error && <EmptyState title="Shopping list unavailable" description={error} />}
      {!loading && !error && !shoppingList && <EmptyState title="No shopping list found" description="Create or update a list in Mealie, then refresh this page." />}

      {!loading && !error && shoppingList && items.length === 0 && (
        <EmptyState title="This list is empty" description="Add ingredients from a recipe or create items in Mealie to see them here." />
      )}

      {!loading && !error && items.length > 0 && (
        <section className="space-y-3">
          {items.map((item) => (
            <ShoppingItemRow key={item.id} item={item} onDelete={(i) => void handleDeleteItem(i)} />
          ))}
        </section>
      )}
    </div>
  )
}