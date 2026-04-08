import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type DialogSheetProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function DialogSheet({ open, title, description, onClose, children, footer }: DialogSheetProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-taupe/70 bg-parchment shadow-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-b-taupe/60 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-display text-3xl tracking-[-0.03em] text-ink">{title}</h2>
            {description && <p className="mt-2 text-sm leading-6 text-oliveGray">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-taupe bg-cream text-ink"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(88dvh-10.5rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && <div className="border-t border-taupe/60 bg-cream/60 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}