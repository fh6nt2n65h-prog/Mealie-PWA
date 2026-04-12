import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { ApiSettings } from '@/types/mealie'
import { defaultSettings, loadSettings, saveSettings } from '@/lib/storage'
import { MealieApi, ensureModeCategories, type ModeCategories } from '@/lib/mealie-api'

const SWEET_MODE_KEY = 'mealie.sweet-mode'
const ANIMATION_DURATION_MS = 700

type SettingsContextValue = {
  settings: ApiSettings
  updateSettings: (nextSettings: ApiSettings) => void
  isSweetMode: boolean
  isAnimating: boolean
  toggleSweetMode: () => void
  modeCategories: ModeCategories | null
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ApiSettings>(loadSettings)
  const [isSweetMode, setIsSweetMode] = useState(() => localStorage.getItem(SWEET_MODE_KEY) === '1')
  const [isAnimating, setIsAnimating] = useState(false)
  const [modeCategories, setModeCategories] = useState<ModeCategories | null>(null)
  const animationTimerRef = useRef<number | null>(null)

  // Sync CSS class on mount to restore persisted mode
  useEffect(() => {
    document.documentElement.classList.toggle('sweet-mode', isSweetMode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback((nextSettings: ApiSettings) => {
    const normalized = {
      baseUrl: nextSettings.baseUrl || defaultSettings.baseUrl,
      apiToken: nextSettings.apiToken || ''
    }

    setSettings(normalized)
    saveSettings(normalized)
  }, [])

  const toggleSweetMode = useCallback(() => {
    setIsAnimating(true)
    setIsSweetMode((prev) => {
      const next = !prev
      localStorage.setItem(SWEET_MODE_KEY, next ? '1' : '0')
      
      // Delay CSS class so the new-colour pour can animate over the old-colour background
      window.setTimeout(() => {
        document.documentElement.classList.toggle('sweet-mode', next)
      }, 200)

      return next
    })

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current)
    }

    animationTimerRef.current = window.setTimeout(() => {
      setIsAnimating(false)
      animationTimerRef.current = null
    }, ANIMATION_DURATION_MS)
  }, [])

  // Resolve or create the savoury/sweet categories once settings are available
  useEffect(() => {
    if (!settings.baseUrl || !settings.apiToken) {
      return
    }

    const api = new MealieApi(settings)

    ensureModeCategories(api)
      .then(setModeCategories)
      .catch((err: unknown) => {
        console.warn('Could not resolve mode categories:', err)
      })
  }, [settings.baseUrl, settings.apiToken])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isSweetMode, isAnimating, toggleSweetMode, modeCategories }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider')
  }

  return context
}