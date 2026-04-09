import { useEffect, useMemo, useRef, useState } from 'react'
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
  x: number
  y: number
}

type HighlightNode =
  | { type: 'text'; value: string }
  | { type: 'highlight'; value: string; ingredient: RecipeIngredient; id: string }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightNodes(text: string, ingredients: RecipeIngredient[]): HighlightNode[] {
  const ingredientMap = new Map<string, RecipeIngredient>()

  ingredients.forEach((ingredient) => {
    extractIngredientKeywords(ingredient).forEach((keyword) => {
      if (!ingredientMap.has(keyword)) {
        ingredientMap.set(keyword, ingredient)
      }
    })
  })

  const keywords = Array.from(ingredientMap.keys()).sort((a, b) => b.length - a.length)
  const nodes: HighlightNode[] = []
  let cursor = 0

  while (cursor < text.length) {
    let nextMatch: { index: number; value: string; ingredient: RecipeIngredient; id: string } | null = null

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
      const slice = text.slice(cursor)
      const match = regex.exec(slice)

      if (!match || match.index === undefined) {
        continue
      }

      const absoluteIndex = cursor + match.index
      const candidate = {
        index: absoluteIndex,
        value: match[0],
        ingredient: ingredientMap.get(keyword)!,
        id: `${keyword}-${absoluteIndex}`,
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
    })

    cursor = nextMatch.index + nextMatch.value.length
  }

  return nodes
}

export function IngredientHighlighter({ text, ingredients }: IngredientHighlighterProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const tooltipTimeoutRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const nodes = useMemo(() => buildHighlightNodes(text, ingredients), [text, ingredients])

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  function showTooltip(element: HTMLElement, ingredient: RecipeIngredient, id: string) {
    const rect = element.getBoundingClientRect()
    const rootRect = rootRef.current?.getBoundingClientRect()

    if (!rootRect) {
      return
    }

    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current)
    }

    const label = getIngredientDisplayText(ingredient) || 'Ingredient'

    setTooltip({
      id,
      text: label,
      x: rect.left - rootRect.left + rect.width / 2,
      y: rect.top - rootRect.top
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
            onClick={(event) => showTooltip(event.currentTarget, node.ingredient, node.id)}
            onTouchStart={(event) => showTooltip(event.currentTarget, node.ingredient, node.id)}
            className={`inline rounded-[0.7rem] border border-transparent px-1.5 py-0.5 font-semibold text-terracotta transition-all duration-150 ${tooltip?.id === node.id ? 'bg-terracotta/14 text-ink shadow-insetPaper' : 'bg-terracotta/8 hover:bg-terracotta/12 active:bg-terracotta/16'}`}
          >
            {node.value}
          </button>
        )
      )}

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[1rem] bg-ink px-3 py-2 text-sm font-semibold text-parchment shadow-paper"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`
            }}
          >
            {tooltip.text}
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
