import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App'
import { SettingsProvider } from '@/app/settings-context'
import '@/styles.css'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SettingsProvider>
)