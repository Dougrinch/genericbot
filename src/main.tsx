import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './page/index.css'
import App from './page/App.tsx'
import './widget/injection.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
