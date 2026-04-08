type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-taupe bg-parchment/90 px-6 py-10 text-center shadow-paper">
      <h2 className="font-display text-3xl tracking-[-0.03em] text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-oliveGray">{description}</p>
    </div>
  )
}