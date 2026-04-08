import type { InputHTMLAttributes } from 'react'

type SettingFieldProps = {
  label: string
  description: string
} & InputHTMLAttributes<HTMLInputElement>

export function SettingField({ label, description, ...props }: SettingFieldProps) {
  return (
    <label className="block space-y-2.5">
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-oliveGray">{label}</p>
        <p className="mt-1 text-sm leading-6 text-oliveGray">{description}</p>
      </div>
      <input
        {...props}
        className="w-full rounded-[1.35rem] border border-taupe/70 bg-parchment px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-terracotta"
      />
    </label>
  )
}