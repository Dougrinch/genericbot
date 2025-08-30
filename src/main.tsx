import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './game/index.css'
import Game from './game/Game.tsx'
import './bot/injection.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
)
