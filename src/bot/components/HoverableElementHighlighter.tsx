import { type ReactNode, useCallback, useRef } from "react"
import { type Selection, useBotContext } from "./BotContext.ts"

interface HoverableElementHighlighterProps {
  elements: HTMLElement[]
  children: ReactNode
}

export function HoverableElementHighlighter(props: HoverableElementHighlighterProps) {
  const botContext = useBotContext()
  const selections = useRef<Selection[]>([])

  const handleMouseLeave = useCallback(() => {
    for (const selection of selections.current) {
      selection.clear()
    }

    botContext.setPanelTransparency(false)
  }, [botContext])

  const handleMouseEnter = useCallback(() => {
    handleMouseLeave()

    for (const element of props.elements) {
      const selection = botContext.selectElement(element)
      selections.current.push(selection)
    }

    if (props.elements.length > 0) {
      botContext.setPanelTransparency(true)
    }
  }, [handleMouseLeave, props.elements, botContext])

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: "pointer" }}
    >
      {props.children}
    </div>
  )
}
