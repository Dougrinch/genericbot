import * as React from "react"
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

  return (
    <div id="bot">
      <BotCSS>
        <BotManagerContext value={botManager}>
          <BotContent terminate={props.terminate} hotReloadInfo={props.hotReloadInfo} />
        </BotManagerContext>
      </BotCSS>
    </div>
  )
}
