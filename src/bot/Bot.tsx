import { useState } from "react"
import { BotPanel } from "./components/BotPanel"
import { BotHeader } from "./components/BotHeader"
import { ConfigWrapper } from "./components/ConfigWrapper"
import { ActionRow } from "./components/ActionRow"

function Bot() {
  const [isConfigVisible, setIsConfigVisible] = useState(false)

  return (
    <BotPanel>
      {onDragStart => (
        <>
          <BotHeader onDragStart={onDragStart} />
          <ConfigWrapper isVisible={isConfigVisible} />
          <ActionRow onToggleConfig={() => setIsConfigVisible(!isConfigVisible)} />
        </>
      )}
    </BotPanel>
  )
}

export default Bot
