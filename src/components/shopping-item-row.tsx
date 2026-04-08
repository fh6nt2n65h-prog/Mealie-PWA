import { Check } from 'lucide-react'
import clsx from 'clsx'
import type { ShoppingListItem } from '@/types/mealie'
import { getShoppingItemText } from '@/lib/utils'

type ShoppingItemRowProps = {
  item: ShoppingListItem
  onToggle: (item: ShoppingListItem) => void
  disabled?: boolean
}

export function ShoppingItemRow({ item, onToggle, disabled = false }: ShoppingItemRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      disabled={disabled}
      className="grid w-full grid-cols-[auto_1fr] items-start gap-4 rounded-[1.35rem] border border-taupe/65 bg-parchment px-4 py-4 text-left shadow-paper disabled:opacity-60"
    >
      <span
        className={clsx(
          'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
          item.checked ? 'border-olive bg-olive text-parchment' : 'border-taupe bg-cream text-transparent'
        )}
      >
        <Check className="h-4 w-4" />
      </span>

      <span className="space-y-1">
        <span className={clsx('block text-base leading-6 text-ink', item.checked && 'text-oliveGray line-through')}>{getShoppingItemText(item)}</span>
        <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-oliveGray">
          {item.quantity ? `${item.quantity}` : 'Qty flexible'} {item.unit?.abbreviation || item.unit?.name || ''}
        </span>
      </span>
    </button>
  )
}