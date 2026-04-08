import { useEffect, useState } from 'react'

export function useStoredState<T>(loader: () => T, saver: (value: T) => void) {
  const [value, setValue] = useState<T>(loader)

  useEffect(() => {
    saver(value)
  }, [saver, value])

  return [value, setValue] as const
}