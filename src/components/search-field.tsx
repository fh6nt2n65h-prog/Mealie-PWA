import clsx from 'clsx'
import { forwardRef } from 'react'
import { Search } from 'lucide-react'

type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField({ value, onChange, placeholder = 'Search recipes', className, autoFocus }, ref) {
  return (
    <label className={clsx('flex items-center gap-3 rounded-full border border-taupe/70 bg-parchment px-4 py-3 shadow-insetPaper', className)}>
      <Search className="h-4 w-4 text-oliveGray" />
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-oliveGray"
      />
    </label>
  )
})