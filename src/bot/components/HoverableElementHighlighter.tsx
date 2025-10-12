import { type ReactNode, useCallback, useEffect, useRef } from "react"
import { useBotPanelRef } from "./BotPanelContext.ts"

interface HoverableElementHighlighterProps {
  elements: HTMLElement[]
  children: ReactNode
}

export function HoverableElementHighlighter(props: HoverableElementHighlighterProps) {
  const rootRef = useBotPanelRef()
  const overlaysRef = useRef<HTMLDivElement[] | null>(null)

  const handleMouseLeave = useCallback(() => {
    overlaysRef.current?.forEach(e => e.remove())
    overlaysRef.current = null

    rootRef.current?.classList.remove("transparent-above-highlight")
  }, [rootRef])

  const handleMouseEnter = useCallback(() => {
    handleMouseLeave()

    overlaysRef.current = []

    const borderWidth = 10

    for (const element of props.elements) {
      const overlay = document.createElement("div")
      overlay.style.boxSizing = "content-box"
      overlay.style.position = "fixed"
      overlay.style.pointerEvents = "none"
      overlay.style.border = `${borderWidth}px solid #ff4444`
      overlay.style.backgroundColor = "rgba(255, 68, 68, 0.1)"
      overlay.style.zIndex = "2147483646"
      overlay.style.borderRadius = "4px"
      overlay.style.boxShadow = "0 0 10px rgba(255, 68, 68, 0.5)"
      overlay.style.transition = "all 0.2s ease"

      const rect = element.getBoundingClientRect()
      overlay.style.left = `${rect.left - borderWidth}px`
      overlay.style.top = `${rect.top - borderWidth}px`
      overlay.style.width = `${rect.width}px`
      overlay.style.height = `${rect.height}px`

      overlaysRef.current.push(overlay)
      document.body.appendChild(overlay)
    }

    if (props.elements.length > 0) {
      rootRef.current?.classList.add("transparent-above-highlight")
    }
  }, [handleMouseLeave, props.elements, rootRef])

  useEffect(() => {
    return () => {
      handleMouseLeave()
    }
  }, [handleMouseLeave])

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
