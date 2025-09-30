import { memo, useCallback, useEffect, useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { BotHeader } from "./components/BotHeader"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionsRow } from "./components/ActionsRow.tsx"
import { hotReload, type HotReloadInfo } from "./hotReload.ts"
import { BotManagerContext, useBotManager } from "./BotManagerContext.tsx"
import { BotManager } from "./logic/BotManager.ts"

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
  terminate: () => void
  hotReloadInfo?: HotReloadInfo
}

export function Bot(props: BotProps) {
  const botManager = useBotManager(() => new BotManager())
  return (
    <BotManagerContext value={botManager}>
      <BotContent root={props.root} terminate={props.terminate} hotReloadInfo={props.hotReloadInfo} />
    </BotManagerContext>
  )
}

const BotContent = memo(({ root, terminate, hotReloadInfo }: BotProps) => {
  const [isConfigVisible, setIsConfigVisible] = useState(!!hotReloadInfo)

  const onHotReload = useCallback(() => {
    hotReload(terminate)
  }, [terminate])

  const css = useCss()
  if (css === null) {
    return null
  }

  return (
    <BotPanel>
      <style>{css}</style>
      <BotHeader />
      <ConfigWrapper
        root={root}
        isVisible={isConfigVisible}
        onClose={terminate}
        onHotReload={onHotReload}
      />
      <ActionsRow onToggleConfig={() => setIsConfigVisible(!isConfigVisible)} />
    </BotPanel>
  )
})
