import * as React from "react"
import { useCallback } from "react"
import { type HotReloadInfo } from "./hotReload.ts"
import { BotManagerContext, useBotManager } from "./BotManagerContext.tsx"
import { BotManager } from "./logic/BotManager.ts"
import { BotCSS } from "./BotCSS.tsx"
import { BotContent } from "./components/BotContent.tsx"

export type BotProps = {
  outerRoot: HTMLElement
  terminate: () => void
  hotReloadInfo?: HotReloadInfo
}

export function Bot(props: BotProps) {
  const botManager = useBotManager(() => new BotManager())

  const terminate = useCallback(() => {
    botManager.dispatch.close()
    props.terminate()
  }, [botManager, props])

  return (
    <div id="bot">
      <BotCSS>
        <BotManagerContext value={botManager}>
          <BotContent terminate={terminate} hotReloadInfo={props.hotReloadInfo} />
        </BotManagerContext>
      </BotCSS>
    </div>
  )
}
