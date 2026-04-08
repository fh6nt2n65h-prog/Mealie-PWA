import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type HeaderSlots = {
  sideContent?: ReactNode
  bottomContent?: ReactNode
}

type HeaderSlotsContextValue = {
  slots: HeaderSlots
  setSlots: (slots: HeaderSlots) => void
}

const HeaderSlotsContext = createContext<HeaderSlotsContextValue | null>(null)

export function HeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<HeaderSlots>({})
  const value = useMemo(() => ({ slots, setSlots }), [slots])

  return <HeaderSlotsContext.Provider value={value}>{children}</HeaderSlotsContext.Provider>
}

export function useHeaderSlots(slots: HeaderSlots) {
  const context = useContext(HeaderSlotsContext)

  if (!context) {
    throw new Error('useHeaderSlots must be used inside HeaderSlotsProvider')
  }

  useEffect(() => {
    context.setSlots(slots)

    return undefined
  }, [context, slots])

  useEffect(() => {
    return () => {
      context.setSlots({})
    }
  }, [context])
}

export function useHeaderSlotState() {
  const context = useContext(HeaderSlotsContext)

  if (!context) {
    throw new Error('useHeaderSlotState must be used inside HeaderSlotsProvider')
  }

  return context.slots
}