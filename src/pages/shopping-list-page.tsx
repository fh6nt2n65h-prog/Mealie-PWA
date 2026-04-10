import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, ListChecks } from 'lucide-react'
import type { ShoppingList, ShoppingListItem, ShoppingListSummary } from '@/types/mealie'
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
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({})
  const [clearingAll, setClearingAll] = useState(false)

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

  async function handleToggle(item: ShoppingListItem) {
    const nextItem = { ...item, checked: !item.checked }
    setItems((currentItems) => currentItems.map((currentItem) => (currentItem.id === item.id ? nextItem : currentItem)))
    setSyncingIds((current) => ({ ...current, [item.id]: true }))

    try {
      const api = new MealieApi(settings)
      await api.updateShoppingItem(item.id, nextItem)
    } catch (toggleError) {
      setItems((currentItems) => currentItems.map((currentItem) => (currentItem.id === item.id ? item : currentItem)))
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update item state.')
    } finally {
      setSyncingIds((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
    }
  }

  function handleExport() {
    const url = buildRemindersShortcutUrl(items)

    if (!url.endsWith('text=')) {
      window.location.href = url
    }
  }

  async function handleClearAll() {
    if (clearingAll) return
    const toDelete = [...items]
    if (toDelete.length === 0) return

    setClearingAll(true)

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
      // Leave clearingAll=true — button exits via AnimatePresence (items.length===0)
    } else {
      setError(`${failedIds.size} item${failedIds.size !== 1 ? 's' : ''} could not be removed.`)
      setClearingAll(false)
    }
  }

  const checkedItems = items.filter((item) => item.checked)
  return (
    <div className="space-y-5 animate-rise">
      <section className="space-y-4 rounded-card border border-taupe/70 bg-parchment px-5 py-5 shadow-paper sm:px-6">
        <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
          <AnimatePresence initial={false}>
            {items.length > 0 && (
              <motion.button
                layout
                type="button"
                onClick={() => void handleClearAll()}
                disabled={clearingAll}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                style={{ borderRadius: 9999 }}
                className={`inline-flex items-center justify-center border border-terracotta/40 bg-terracotta/10 text-terracotta disabled:opacity-60 ${
                  clearingAll ? 'h-9 w-9' : 'gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                <AnimatePresence initial={false}>
                  {!clearingAll && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="whitespace-nowrap"
                    >
                      Clear
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={handleExport}
            disabled={checkedItems.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-parchment disabled:opacity-45"
          >
            <Download className="h-4 w-4" />
            Export checked to Reminders
          </button>
        </div>

        {shoppingList && (
          <div className="flex items-center gap-3 rounded-[1.3rem] bg-oat/70 px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-parchment text-terracotta">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl tracking-[-0.03em] text-ink">{shoppingList.name || 'Latest list'}</p>
            </div>
          </div>
        )}
      </section>

      {loading && <EmptyState title="Loading the list" description="Pulling your most recently updated shopping list from Mealie." />}
      {!loading && error && <EmptyState title="Shopping list unavailable" description={error} />}
      {!loading && !error && !shoppingList && <EmptyState title="No shopping list found" description="Create or update a list in Mealie, then refresh this page." />}

      {!loading && !error && shoppingList && items.length === 0 && (
        <EmptyState title="This list is empty" description="Add ingredients from a recipe or create items in Mealie to see them here." />
      )}

      {!loading && !error && items.length > 0 && (
        <section className="space-y-3">
          {items.map((item) => (
            <ShoppingItemRow key={item.id} item={item} onToggle={handleToggle} disabled={Boolean(syncingIds[item.id])} />
          ))}
        </section>
      )}
    </div>
  )
}