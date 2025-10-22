import { createRoot } from "react-dom/client"
import { StrictMode } from "react"
import { Bot } from "./Bot.tsx"
import { readAndClearHotReloadInfo } from "./hotReload.ts";

(function () {
  const botDiv = document.createElement("div")
  document.body.appendChild(botDiv)

  const shadowRoot = botDiv.attachShadow({ mode: "open" })

  const hotReloadInfo = readAndClearHotReloadInfo()

  const root = createRoot(shadowRoot)
  root.render(
    <StrictMode>
      <Bot
        outerRoot={botDiv}
        terminate={() => {
          root.unmount()
          botDiv.remove()
        }}
        hotReloadInfo={hotReloadInfo}
      />
    </StrictMode>
  )
})()
