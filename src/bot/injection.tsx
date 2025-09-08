import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import Bot from "./Bot.tsx"

(function () {
  const bot = document.createElement("div")
  bot.id = "bot"
  document.body.appendChild(bot)

  const shadowRoot = bot.attachShadow({ mode: "open" })

  const root = document.createElement("div")
  shadowRoot.appendChild(root)

  createRoot(root).render(
    <StrictMode>
      <Bot />
    </StrictMode>
  )
})()
