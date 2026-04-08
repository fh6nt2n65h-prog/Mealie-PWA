import { AnimatePresence, motion } from 'framer-motion'
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <motion.div
            className="max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-taupe/70 bg-parchment shadow-paper"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-b-taupe/60 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-2xl tracking-[-0.03em] text-ink">{title}</h2>
                {description && <p className="mt-1.5 text-sm leading-6 text-oliveGray">{description}</p>}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-taupe bg-cream text-ink"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(88dvh-10.5rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

            {footer && <div className="sticky bottom-0 border-t border-taupe/60 bg-cream/60 px-5 py-4 sm:px-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}