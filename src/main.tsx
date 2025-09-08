import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import Game from "./game/Game.tsx"
import "./bot/injection.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>
)
