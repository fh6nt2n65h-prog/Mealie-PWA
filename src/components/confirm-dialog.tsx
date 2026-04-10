import { DialogSheet } from '@/components/dialog-sheet'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  showCancelButton?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  showCancelButton = true,
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <DialogSheet
      open={open}
      title={title}
      description={description}
      onClose={() => {
        if (!busy) {
          onCancel()
        }
      }}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {showCancelButton && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-full border border-taupe bg-parchment px-5 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full bg-terracotta px-5 py-3 text-sm font-semibold text-parchment disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      }
    >
      {!description && <p className="text-sm leading-6 text-oliveGray">This action cannot be undone.</p>}
    </DialogSheet>
  )
}
