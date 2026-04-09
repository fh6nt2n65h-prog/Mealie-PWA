import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import type { RecipeIngredient } from '@/types/mealie'
import { extractIngredientKeywords, getIngredientDisplayText } from '@/lib/utils'

type IngredientHighlighterProps = {
  text: string
  ingredients: RecipeIngredient[]
}

type TooltipState = {
  id: string
  text: string
  rawX: number
  y: number
  duplicate: boolean
}

type HighlightNode =
  | { type: 'text'; value: string }
  | { type: 'highlight'; value: string; ingredient: RecipeIngredient; id: string; duplicate: boolean }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightNodes(text: string, ingredients: RecipeIngredient[]): HighlightNode[] {
  const ingredientMap = new Map<string, RecipeIngredient[]>()

  ingredients.forEach((ingredient) => {
    extractIngredientKeywords(ingredient).forEach((keyword) => {
      const current = ingredientMap.get(keyword)

      if (!current) {
        ingredientMap.set(keyword, [ingredient])
        return
      }

      if (!current.includes(ingredient)) {
        current.push(ingredient)
      }
    })
  })

  const keywords = Array.from(ingredientMap.keys()).sort((a, b) => b.length - a.length)
  const nodes: HighlightNode[] = []
  let cursor = 0

  while (cursor < text.length) {
    let nextMatch: { index: number; value: string; ingredient: RecipeIngredient; id: string; duplicate: boolean } | null = null

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
      const slice = text.slice(cursor)
      const match = regex.exec(slice)
      const candidates = ingredientMap.get(keyword)

      if (!match || match.index === undefined || !candidates || candidates.length === 0) {
        continue
      }

      const absoluteIndex = cursor + match.index
      const candidate = {
        index: absoluteIndex,
        value: match[0],
        ingredient: candidates[0],
        id: `${keyword}-${absoluteIndex}`,
        duplicate: candidates.length > 1,
      }

      if (!nextMatch || absoluteIndex < nextMatch.index || (absoluteIndex === nextMatch.index && candidate.value.length > nextMatch.value.length)) {
        nextMatch = candidate
      }
    }

    if (!nextMatch) {
      nodes.push({ type: 'text', value: text.slice(cursor) })
      break
    }

    if (nextMatch.index > cursor) {
      nodes.push({ type: 'text', value: text.slice(cursor, nextMatch.index) })
    }

    nodes.push({
      type: 'highlight',
      value: nextMatch.value,
      ingredient: nextMatch.ingredient,
      id: nextMatch.id,
      duplicate: nextMatch.duplicate,
    })

    cursor = nextMatch.index + nextMatch.value.length
  }

  return nodes
}

export function IngredientHighlighter({ text, ingredients }: IngredientHighlighterProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const tooltipTimeoutRef = useRef<number | null>(null)
  const tooltipElRef = useRef<HTMLDivElement>(null)
  const triggerElRef = useRef<HTMLElement | null>(null)
  // Clamped left/top set at initial placement so scroll handler can diff
  const initialPosRef = useRef<{ left: number; top: number } | null>(null)
  // Measured size captured once so scroll handler never reads offsetWidth mid-frame
  const tooltipSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const rafRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)

  // GPU-composited scroll offsets — driven without React re-renders
  const scrollDx = useMotionValue(0)
  const scrollDy = useMotionValue(0)

  const nodes = useMemo(() => buildHighlightNodes(text, ingredients), [text, ingredients])

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) window.clearTimeout(tooltipTimeoutRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Single permanent scroll listener registered ONCE on mount.
  // Old approach re-registered on tooltip?.id change, leaving a gap between cleanup and
  // re-registration during which the second tooltip had no listener and froze in place.
  useEffect(() => {
    const scrollEl = document.getElementById('app-scroll-root')
    if (!scrollEl) return

    function updatePosition() {
      rafRef.current = null
      const trigger = triggerElRef.current
      const el = tooltipElRef.current
      const initPos = initialPosRef.current
      if (!trigger || !el || !initPos) return

      const triggerRect = trigger.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()

      // Clip when trigger scrolls behind the header or bottom nav
      const midY = triggerRect.top + triggerRect.height / 2
      const inBounds = midY > scrollRect.top && midY < scrollRect.bottom
      el.style.visibility = inBounds ? 'visible' : 'hidden'
      if (!inBounds) return

      // Compute new ideal position
      const { w, h } = tooltipSizeRef.current
      const centerX = triggerRect.left + triggerRect.width / 2
      const newLeft = Math.max(8, Math.min(centerX - w / 2, window.innerWidth - w - 8))
      const newTop = triggerRect.top - h - 10

      // Motion value set = GPU transform update, zero layout cost
      scrollDx.set(newLeft - initPos.left)
      scrollDy.set(newTop - initPos.top)
    }

    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(updatePosition)
    }

    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [scrollDx, scrollDy])

  // Initial placement: sets left/top ONCE per tooltip id before the browser paints.
  // Resets scroll offset to 0 so the new tooltip starts centred on its word.
  // left/top are not owned by Framer Motion so they persist alongside x/y motion values.
  useLayoutEffect(() => {
    const el = tooltipElRef.current
    if (!el || !tooltip) return

    scrollDx.set(0)
    scrollDy.set(0)
    el.style.visibility = 'visible'

    const w = el.offsetWidth
    const h = el.offsetHeight
    tooltipSizeRef.current = { w, h }

    const rawLeft = tooltip.rawX - w / 2
    const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8))
    const top = tooltip.y - h - 10

    el.style.left = `${clampedLeft}px`
    el.style.top = `${top}px`
    initialPosRef.current = { left: clampedLeft, top }
  }, [tooltip?.id, scrollDx, scrollDy])

  function showTooltip(element: HTMLElement, ingredient: RecipeIngredient, id: string, duplicate: boolean) {
    triggerElRef.current = element
    const rect = element.getBoundingClientRect()

    if (tooltipTimeoutRef.current) window.clearTimeout(tooltipTimeoutRef.current)

    const label = getIngredientDisplayText(ingredient) || 'Ingredient'

    setTooltip({
      id,
      text: label,
      rawX: rect.left + rect.width / 2,
      y: rect.top,
      duplicate,
    })

    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip(null)
      tooltipTimeoutRef.current = null
    }, 3000)
  }

  return (
    <span ref={rootRef} className="relative">
      {nodes.map((node, index) =>
        node.type === 'text' ? (
          <span key={index}>{node.value}</span>
        ) : (
          <button
            key={node.id}
            type="button"
            onClick={(event) => showTooltip(event.currentTarget, node.ingredient, node.id, node.duplicate)}
            onTouchStart={(event) => showTooltip(event.currentTarget, node.ingredient, node.id, node.duplicate)}
            className={`inline rounded-[0.7rem] border border-transparent px-1.5 py-0.5 font-semibold text-terracotta transition-all duration-150 ${tooltip?.id === node.id ? 'bg-terracotta/14 text-ink shadow-insetPaper' : 'bg-terracotta/8 hover:bg-terracotta/12 active:bg-terracotta/16'}`}
          >
            {node.value}
          </button>
        )
      )}

      {createPortal(
        <AnimatePresence>
          {tooltip && (
            <motion.div
              ref={tooltipElRef}
              key={tooltip.id}
              // x/y are GPU-composited by Framer Motion (no layout cost per frame).
              // left/top set once in layoutEffect above and not touched by Framer Motion.
              style={{ x: scrollDx, y: scrollDy }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.12 } }}
              exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
              className="pointer-events-none fixed z-50 rounded-[1rem] bg-ink px-3 py-2 text-sm font-semibold leading-6 text-parchment shadow-paper"
            >
              <p className="max-w-[min(19rem,calc(100vw-1rem))] whitespace-nowrap">{tooltip.text}</p>
              {tooltip.duplicate ? <p className="mt-0.5 text-[0.7rem] italic text-parchment/75">Duplicate</p> : null}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}
