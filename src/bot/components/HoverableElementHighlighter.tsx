import { type ReactNode, useCallback, useEffect, useRef } from "react"

interface HoverableElementHighlighterProps {
  elements: HTMLElement[]
  children: ReactNode
}

export function HoverableElementHighlighter(props: HoverableElementHighlighterProps) {
  const overlaysRef = useRef<HTMLDivElement[] | null>(null)

  const handleMouseLeave = useCallback(() => {
    overlaysRef.current?.forEach(e => e.remove())
    overlaysRef.current = null
  }, [])

  const handleMouseEnter = useCallback(() => {
    handleMouseLeave()

    overlaysRef.current = []

    for (const element of props.elements) {
      const overlay = document.createElement("div")
      overlay.style.position = "fixed"
      overlay.style.pointerEvents = "none"
      overlay.style.border = "3px solid #ff4444"
      overlay.style.backgroundColor = "rgba(255, 68, 68, 0.1)"
      overlay.style.zIndex = "2147483646"
      overlay.style.borderRadius = "4px"
      overlay.style.boxShadow = "0 0 10px rgba(255, 68, 68, 0.5)"
      overlay.style.transition = "all 0.2s ease"

      const rect = element.getBoundingClientRect()
      overlay.style.left = `${rect.left}px`
      overlay.style.top = `${rect.top}px`
      overlay.style.width = `${rect.width}px`
      overlay.style.height = `${rect.height}px`

      overlaysRef.current.push(overlay)
      document.body.appendChild(overlay)
    }
  }, [handleMouseLeave, props.elements])

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
