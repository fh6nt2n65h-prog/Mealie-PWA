import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App'
import { SettingsProvider } from '@/app/settings-context'
import '@/styles.css'

registerSW({ immediate: true })

if (typeof document !== 'undefined') {
  let lastTouchEndAt = 0

  const preventGestureZoom = (event: Event) => {
    event.preventDefault()
  }

  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = Date.now()

    if (now - lastTouchEndAt <= 300) {
      event.preventDefault()
    }

    lastTouchEndAt = now
  }

  document.addEventListener('gesturestart', preventGestureZoom, { passive: false })
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false })
  document.addEventListener('gestureend', preventGestureZoom, { passive: false })
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SettingsProvider>
)