import { useState } from 'react'
import { ChefHat, PlugZap } from 'lucide-react'
import type { MealPlanDensity, ViewMode } from '@/types/mealie'
import { useSettings } from '@/app/settings-context'
import { SegmentedControl } from '@/components/segmented-control'
import { SettingField } from '@/components/setting-field'
import { useStoredState } from '@/hooks/use-stored-state'
import { loadMealPlanDensity, loadViewMode, saveMealPlanDensity, saveViewMode } from '@/lib/storage'
import { MealieApi, MealieApiError } from '@/lib/mealie-api'

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [draftSettings, setDraftSettings] = useState(settings)
  const [status, setStatus] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isError, setIsError] = useState(false)
  const [viewMode, setViewMode] = useStoredState<ViewMode>(loadViewMode, saveViewMode)
  const [mealPlanDensity, setMealPlanDensity] = useStoredState<MealPlanDensity>(loadMealPlanDensity, saveMealPlanDensity)

  async function handleTestConnection() {
    setTesting(true)
    setStatus('')
    setIsError(false)

    try {
      const api = new MealieApi(draftSettings)
      const user = await api.getCurrentUser()
      setStatus(`Connected as ${user.fullName || user.username || 'your Mealie user'} in ${user.household || 'your household'}.`)
    } catch (error) {
      const message = error instanceof MealieApiError ? error.message : 'Unable to reach your Mealie instance.'
      setStatus(message)
      setIsError(true)
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    setSaving(true)
    updateSettings(draftSettings)
    setStatus('Settings saved locally on this device.')
    setIsError(false)
    window.setTimeout(() => setSaving(false), 180)
  }

  return (
    <div className="space-y-5 animate-rise">
      <section className="rounded-card border border-taupe/70 bg-parchment px-5 py-6 shadow-paper sm:px-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-oat text-terracotta">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-3xl tracking-[-0.03em] text-ink">Connect your kitchen</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-oliveGray">
              This client stores the Mealie base URL and API token in local storage so it can behave like a standalone home screen app on iPhone and iPad.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <SettingField
            label="Mealie Base URL"
            description="The app adds /api automatically. For a Pi deployment that proxies Mealie through this client, use the client URL here instead of the raw Mealie URL."
            value={draftSettings.baseUrl}
            onChange={(event) => setDraftSettings((current) => ({ ...current, baseUrl: event.target.value }))}
            placeholder="http://192.168.1.91:9000"
          />

          <SettingField
            label="API Token"
            description="Paste a long-lived Mealie API token here. It is sent as a Bearer token on each request."
            value={draftSettings.apiToken}
            onChange={(event) => setDraftSettings((current) => ({ ...current, apiToken: event.target.value }))}
            placeholder="Paste your Mealie API token"
            type="password"
          />

          <div className="space-y-3 rounded-[1.4rem] bg-oat/60 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">Recipe view</p>
              <p className="mt-1 text-sm leading-6 text-oliveGray">Choose how recipes open by default.</p>
            </div>
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', label: 'List' },
                { value: 'grid', label: 'Grid' },
                { value: 'swipe', label: 'Swipe' }
              ]}
            />
          </div>

          <div className="space-y-3 rounded-[1.4rem] bg-oat/60 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">Meal plan density</p>
              <p className="mt-1 text-sm leading-6 text-oliveGray">Compact hides empty days and empty meal slots.</p>
            </div>
            <SegmentedControl
              value={mealPlanDensity}
              onChange={setMealPlanDensity}
              options={[
                { value: 'advanced', label: 'Advanced' },
                { value: 'compact', label: 'Compact' }
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-olive px-5 py-3 text-sm font-semibold text-parchment"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-taupe bg-cream px-5 py-3 text-sm font-semibold text-ink"
          >
            <PlugZap className="h-4 w-4" />
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {status && (
          <p className={`mt-5 rounded-[1.2rem] px-4 py-3 text-sm leading-6 ${isError ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/20 text-olive'}`}>
            {status}
          </p>
        )}
      </section>

      <section className="rounded-card border border-taupe/70 bg-oat/60 px-5 py-6 shadow-paper sm:px-7">
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-oliveGray">Before you continue</h3>
        <p className="mt-3 text-sm leading-6 text-oliveGray">
          If your PWA will be installed on iPhone, the public URL used in Safari must ultimately be HTTPS. The app still works against a local HTTP base URL inside your own network, but service workers and installability depend on the secure reverse proxy described in the README.
        </p>
      </section>
    </div>
  )
}