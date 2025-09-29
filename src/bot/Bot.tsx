import { useCallback, useEffect, useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { BotHeader } from "./components/BotHeader"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionsRow } from "./components/ActionsRow.tsx"
import { BotStateContext } from "./BotStateContext.tsx"
import { dispatch } from "./logic/BotManager.ts"
import { hotReload, type HotReloadInfo } from "./hotReload.ts"

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

export type BotProps = {
  root: HTMLElement
  hotReloadInfo?: HotReloadInfo
}

export function Bot({ root, hotReloadInfo }: BotProps) {
  const [isConfigVisible, setIsConfigVisible] = useState(!!hotReloadInfo)

  const onClose = useCallback(() => {
    dispatch.close()
    root.remove()
  }, [dispatch, root])

  const onHotReload = useCallback(() => {
    hotReload(root)
  }, [dispatch, root])

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
          onClose={onClose}
          onHotReload={onHotReload}
        />
        <ActionsRow onToggleConfig={() => setIsConfigVisible(!isConfigVisible)} />
      </BotPanel>
    </BotStateContext>
  )
}
