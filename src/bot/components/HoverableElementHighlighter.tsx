import { type ReactNode, useCallback, useRef } from "react"
import { type Selection, useSelectElement } from "./BotContentContext.ts"
import { useSetBotUITransparency } from "./BotUIContext.tsx"

interface HoverableElementHighlighterProps {
  elements: HTMLElement[]
  children: ReactNode
}

export function HoverableElementHighlighter(props: HoverableElementHighlighterProps) {
  const selectElement = useSelectElement()
  const setBotUITransparency = useSetBotUITransparency()
  const selections = useRef<Selection[]>([])

  const handleMouseLeave = useCallback(() => {
    for (const selection of selections.current) {
      selection.clear()
    }

    setBotUITransparency(false)
  }, [setBotUITransparency])

  const handleMouseEnter = useCallback(() => {
    handleMouseLeave()

    for (const element of props.elements) {
      const selection = selectElement(element)
      selections.current.push(selection)
    }

    if (props.elements.length > 0) {
      setBotUITransparency(true)
    }
  }, [handleMouseLeave, props.elements, selectElement, setBotUITransparency])

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
