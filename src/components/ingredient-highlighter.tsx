import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const nodes = useMemo(() => buildHighlightNodes(text, ingredients), [text, ingredients])

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  // Re-measure trigger element position on scroll so the tooltip follows its word.
  useEffect(() => {
    if (!tooltip) return
    const scrollEl = document.getElementById('app-scroll-root')
    if (!scrollEl) return

    function onScroll() {
      const trigger = triggerElRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      setTooltip((prev) => prev ? { ...prev, rawX: rect.left + rect.width / 2, y: rect.top } : null)
    }

    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [tooltip?.id])

  // After each tooltip change the element is in the DOM at opacity:0 (Framer initial).
  // Measure actual rendered width, then clamp left so the tooltip never escapes the viewport.
  // This all happens before the browser paints, so there is no visible flicker.
  useLayoutEffect(() => {
    const el = tooltipElRef.current
    if (!el || !tooltip) return
    const w = el.offsetWidth
    const rawLeft = tooltip.rawX - w / 2
    const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - w - 8))
    el.style.left = `${clampedLeft}px`
  }, [tooltip])

  function showTooltip(element: HTMLElement, ingredient: RecipeIngredient, id: string, duplicate: boolean) {
    triggerElRef.current = element
    const rect = element.getBoundingClientRect()

    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current)
    }

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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.12 } }}
              exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
              className="pointer-events-none fixed z-50 -translate-y-[calc(100%+10px)] rounded-[1rem] bg-ink px-3 py-2 text-sm font-semibold leading-6 text-parchment shadow-paper"
              style={{
                left: `${tooltip.rawX}px`,
                top: `${tooltip.y}px`
              }}
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
