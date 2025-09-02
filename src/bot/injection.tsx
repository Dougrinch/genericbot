import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import Bot from "./Bot.tsx"
import botCSS from "./bot.css?inline";

(function () {
  const bot = document.createElement("div")
  bot.id = "bot"
  document.body.appendChild(bot)
  const root = bot.attachShadow({ mode: "open" })

  // Inject CSS into Shadow DOM
  const style = document.createElement("style")
  style.textContent = botCSS
  root.appendChild(style)

  createRoot(root).render(
    <StrictMode>
      <Bot />
    </StrictMode>
  )
})()
