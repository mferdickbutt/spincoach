import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyDocumentLang, readLang } from '@/locale/lang'
import App from './App.tsx'
import './index.css'

applyDocumentLang(readLang())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
