import clsx from 'clsx'

type SegmentedControlOption<T extends string> = {
  label: string
  value: T
}

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Array<SegmentedControlOption<T>>
}

export function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-full border border-taupe/80 bg-parchment p-1 shadow-paper">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-full px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors sm:px-5',
            option.value === value ? 'bg-ink text-parchment' : 'text-oliveGray hover:text-ink'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}