import { useCallback, useEffect, useRef, useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionsRow } from "./components/ActionsRow.tsx"
import { hotReload, type HotReloadInfo } from "./hotReload.ts"
import { BotManagerContext, useBotManager } from "./BotManagerContext.tsx"
import { BotManager } from "./logic/BotManager.ts"
import { useThrottledTime } from "./components/ThrottlingDetector.tsx"
import { formatTime } from "../utils/time.ts"

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
  outerRoot: HTMLElement
  terminate: () => void
  hotReloadInfo?: HotReloadInfo
}

export function Bot(props: BotProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const botManager = useBotManager(() => new BotManager())

  const css = useCss()
  if (css === null) {
    return null
  }

  return (
    <div id="bot" ref={rootRef}>
      <style>{css}</style>
      <BotManagerContext value={botManager}>
        <BotContent outerRoot={props.outerRoot} terminate={props.terminate} hotReloadInfo={props.hotReloadInfo} />
      </BotManagerContext>
    </div>
  )
}

function BotContent({ outerRoot, terminate, hotReloadInfo }: BotProps) {
  const [isConfigVisible, setIsConfigVisible] = useState(!!hotReloadInfo)
  const [isMinimized, setIsMinimized] = useState(false)

  const onHotReload = useCallback(() => {
    hotReload(terminate)
  }, [terminate])

  const handleToggleConfig = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false)
    }
    setIsConfigVisible(!isConfigVisible)
  }, [isMinimized, isConfigVisible])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
    setIsConfigVisible(false)
  }, [])

  const throttledTime = useThrottledTime()

  return (
    <BotPanel>
      {throttledTime != null && (
        <div className="throttle-warning">
          {`Throttling detected, lost ${formatTime(throttledTime)}`}
        </div>
      )}
      <ConfigWrapper
        outerRoot={outerRoot}
        isVisible={isConfigVisible}
        onClose={terminate}
        onHotReload={onHotReload}
        onMinimize={handleMinimize}
      />
      <ActionsRow onToggleConfig={handleToggleConfig} isMinimized={isMinimized} />
    </BotPanel>
  )
}
