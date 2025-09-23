import { useEffect, useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { BotHeader } from "./components/BotHeader"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionRow } from "./components/ActionRow"
import { BotStateContext } from "./BotStateContext.tsx"
import { dispatch } from "./logic/BotManager.ts"

function useCss(): string | null {
  const [value, setValue] = useState<string | null>(null)

  useEffect(() => {
    let ignored = false
    const loadCss = async () => {
      const initial = await import("./bot.css?inline")
      if (!ignored) {
        setValue(initial.default)

        if (import.meta.hot) {
          import.meta.hot.accept("./bot.css?inline", updated => {
            if (!ignored) {
              setValue(updated!.default as string)
            }
          })
        }
      }
    }
    void loadCss()
    return () => {
      ignored = true
    }
  }, [])

  return value
}

function Bot({ root }: { root: HTMLElement }) {
  const [isConfigVisible, setIsConfigVisible] = useState(false)

  const css = useCss()
  if (css === null) {
    return null
  }

  return (
    <BotStateContext>
      <BotPanel>
        <style>{css}</style>
        <BotHeader />
        <ConfigWrapper
          isVisible={isConfigVisible}
          onClose={() => {
            dispatch.close()
            root.remove()
          }}
        />
        <ActionRow onToggleConfig={() => setIsConfigVisible(!isConfigVisible)} />
      </BotPanel>
    </BotStateContext>
  )
}

export default Bot
