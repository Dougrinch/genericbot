import { useThrottledTime } from "./components/ThrottlingDetector.tsx"
import { formatTime } from "../utils/time.ts"
import { ConfigPanel } from "./components/ConfigPanel.tsx"
import { PillsRow } from "./components/PillsRow.tsx"
import * as React from "react"
import { useCallback, useState } from "react"
import { hotReload, type HotReloadInfo } from "./hotReload.ts"

export type BotPanelProps = {
  terminate: () => void
  hotReloadInfo?: HotReloadInfo
}

export function BotPanel({ terminate, hotReloadInfo }: BotPanelProps) {
  const throttledTime = useThrottledTime()

  const [isConfigVisible, setIsConfigVisible] = useState(!!hotReloadInfo)
  const [isMinimized, setIsMinimized] = useState(false)

  const onHotReload = useCallback(() => {
    hotReload(terminate)
  }, [terminate])

  const handleToggleConfig = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false)
    } else {
      setIsConfigVisible(!isConfigVisible)
    }
  }, [isMinimized, isConfigVisible])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
    setIsConfigVisible(false)
  }, [])

  return (
    <div>
      {throttledTime != null && (
        <div className="throttle-warning">
          {`Throttling detected, lost ${formatTime(throttledTime)}`}
        </div>
      )}
      {
        isConfigVisible && (
          <ConfigPanel
            onClose={terminate}
            onHotReload={onHotReload}
            onMinimize={handleMinimize}
          />
        )
      }
      <PillsRow
        onToggleConfig={handleToggleConfig}
        isMinimized={isMinimized}
      />
    </div>
  )
}
