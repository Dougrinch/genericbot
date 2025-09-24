import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import { Bot } from "./Bot.tsx"
import { readAndClearHotReloadInfo } from "./hotReload.ts";

(function () {
  const bot = document.createElement("div")
  bot.id = "bot"
  document.body.appendChild(bot)

  const shadowRoot = bot.attachShadow({ mode: "open" })

  const root = document.createElement("div")
  shadowRoot.appendChild(root)

  const hotReloadInfo = readAndClearHotReloadInfo()

  createRoot(root).render(
    <StrictMode>
      <Bot root={bot} hotReloadInfo={hotReloadInfo} />
    </StrictMode>
  )
})()
