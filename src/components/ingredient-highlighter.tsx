import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RecipeIngredient } from '@/types/mealie'
import { extractIngredientKeywords, getIngredientDisplayText } from '@/lib/utils'

type IngredientHighlighterProps = {
  text: string
  ingredients: RecipeIngredient[]
}

type TooltipState = {
  text: string
  x: number
  y: number
}

export function IngredientHighlighter({ text, ingredients }: IngredientHighlighterProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const tooltipTimeoutRef = useRef<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  // Build a map of ingredient keywords to ingredients for quick lookup
  const ingredientMap = new Map<string, RecipeIngredient>()
  ingredients.forEach((ingredient) => {
    extractIngredientKeywords(ingredient).forEach((keyword) => {
      ingredientMap.set(keyword, ingredient)
    })
  })

  // Parse text into nodes, highlighting matching ingredients
  const nodes: Array<{ type: 'text' | 'highlight'; value: string; ingredient?: RecipeIngredient }> = []
  let remaining = text
  const keywords = Array.from(ingredientMap.keys()).sort((a, b) => b.length - a.length) // Sort by length desc for longer matches first

  while (remaining.length > 0) {
    let foundMatch = false

    for (const keyword of keywords) {
      // Case-insensitive match with word boundaries
      const regex = new RegExp(`\\b${keyword}\\b`, 'i')
      const match = remaining.match(regex)

      if (match && match.index !== undefined) {
        // Add text before match
        if (match.index > 0) {
          nodes.push({ type: 'text', value: remaining.substring(0, match.index) })
        }

        // Add highlighted match
        nodes.push({
          type: 'highlight',
          value: match[0],
          ingredient: ingredientMap.get(keyword)
        })

        // Continue with remaining text
        remaining = remaining.substring(match.index + match[0].length)
        foundMatch = true
        break
      }
    }

    if (!foundMatch) {
      // No more matches, add remaining text
      if (remaining.length > 0) {
        nodes.push({ type: 'text', value: remaining })
      }
      break
    }
  }

  function handleHighlightTap(e: React.TouchEvent<HTMLSpanElement>, ingredient: RecipeIngredient) {
    e.preventDefault()
    const element = e.currentTarget
    const rect = element.getBoundingClientRect()

    // Clear existing timeout
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current)
    }

    const tooltipText = getIngredientDisplayText(ingredient)
    setTooltip({
      text: tooltipText,
      x: rect.left,
      y: rect.top
    })

    // Auto-hide after 3 seconds
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip(null)
      tooltipTimeoutRef.current = null
    }, 3000)
  }

  return (
    <span className="relative">
      {nodes.map((node, index) =>
        node.type === 'text' ? (
          <span key={index}>{node.value}</span>
        ) : (
          <span
            key={index}
            onTouchStart={(e) => handleHighlightTap(e, node.ingredient!)}
            onClick={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              if (tooltipTimeoutRef.current) {
                window.clearTimeout(tooltipTimeoutRef.current)
              }
              const tooltipText = getIngredientDisplayText(node.ingredient!)
              setTooltip({
                text: tooltipText,
                x: rect.left,
                y: rect.top
              })
              tooltipTimeoutRef.current = window.setTimeout(() => {
                setTooltip(null)
                tooltipTimeoutRef.current = null
              }, 3000)
            }}
            className="font-semibold text-terracotta cursor-pointer hover:underline"
          >
            {node.value}
          </span>
        )
      )}

      <AnimatePresence>
        {tooltip && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 rounded-[0.8rem] bg-ink px-2.5 py-1.5 text-xs font-semibold text-parchment shadow-paper"
            style={{
              left: `${Math.max(8, Math.min(tooltip.x, window.innerWidth - 140))}px`,
              top: `${Math.max(8, tooltip.y - 40)}px`
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
