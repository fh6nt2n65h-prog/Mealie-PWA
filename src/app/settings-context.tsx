import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ApiSettings } from '@/types/mealie'
import { defaultSettings, loadSettings, saveSettings } from '@/lib/storage'

type SettingsContextValue = {
  settings: ApiSettings
  updateSettings: (nextSettings: ApiSettings) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ApiSettings>(loadSettings)

  function updateSettings(nextSettings: ApiSettings) {
    const normalized = {
      baseUrl: nextSettings.baseUrl || defaultSettings.baseUrl,
      apiToken: nextSettings.apiToken || ''
    }

    setSettings(normalized)
    saveSettings(normalized)
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider')
  }

  return context
}