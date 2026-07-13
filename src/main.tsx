import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'
import { I18nRoot } from './i18n/I18nProvider'
import { registerSW } from './utils/pwa'

registerSW()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <I18nRoot>
        <App />
      </I18nRoot>
    </HelmetProvider>
  </StrictMode>,
)
