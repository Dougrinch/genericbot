import { useEffect, useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { BotHeader } from "./components/BotHeader"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionRow } from "./components/ActionRow"

function useCss(): string | null {
  const [value, setValue] = useState<string | null>(null)

  useEffect(() => {
    let ignored = false
    const loadCss = async () => {
      return await import("./bot.css?inline")
    }
    loadCss().then(module => {
      if (!ignored) {
        setValue(module.default)

        if (import.meta.hot) {
          import.meta.hot.accept("./bot.css?inline", mn => {
            if (!ignored) {
              setValue(mn!.default)
            }
          })
        }
      }
    })
    return () => {
      ignored = true
    }
  }, [])

  return value
}

function Bot() {
  const [isConfigVisible, setIsConfigVisible] = useState(false)

  const css = useCss()
  if (css === null) {
    return null
  }

  return (
    <BotPanel>
      <style>{css}</style>
      <BotHeader />
      <ConfigWrapper isVisible={isConfigVisible} />
      <ActionRow onToggleConfig={() => setIsConfigVisible(!isConfigVisible)} />
    </BotPanel>
  )
}

export default Bot
