import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import Bot from "./Bot.tsx"

(async function () {
  const bot = document.createElement("div")
  bot.id = "bot"
  document.body.appendChild(bot)
  const root = bot.attachShadow({ mode: "open" })

  const css = await import("./bot.css?inline")

  const style = document.createElement("style")
  style.textContent = css.default
  root.appendChild(style)

  if (import.meta.hot) {
    import.meta.hot.accept("./bot.css?inline", mn => {
      style.textContent = mn!.default
    })
  }

  createRoot(root).render(
    <StrictMode>
      <Bot />
    </StrictMode>
  )
})()
