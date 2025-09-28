import type { ElementInfo } from "../logic/XPathSubscriptionManager.ts"
import { useRef } from "react"

interface ElementsListProps {
  elements: ElementInfo[]
}

function createHighlightOverlay(element: HTMLElement): HTMLDivElement {
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

  document.body.appendChild(overlay)
  return overlay
}

function removeHighlightOverlay(overlay: HTMLDivElement) {
  if (overlay.parentNode) {
    overlay.parentNode.removeChild(overlay)
  }
}

export function ElementsList({ elements }: ElementsListProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const handleMouseEnter = (element: HTMLElement) => {
    overlayRef.current = createHighlightOverlay(element)
  }

  const handleMouseLeave = () => {
    const overlayId = "123"
    if (overlayId) {
      const overlay = overlayRef.current
      if (overlay) {
        removeHighlightOverlay(overlay)
      }
    }
  }

  return (
    <div className="elements-list">
      <div className="elements-list-label">Found elements:</div>
      <div className="elements-list-items">
        {elements.map(el => (
          <div
            key={`${elements.indexOf(el)}-${el.element.textContent}`}
            className={`element-item ${el.isVisible ? "visible" : "hidden"}`}
            onMouseEnter={() => handleMouseEnter(el.element)}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: "pointer" }}
          >
            <span className="element-tag">{el.element.tagName.toLowerCase()}</span>
            <span className="element-content">
              {(el.element.textContent?.trim() ?? "") || "(empty)"}
            </span>
            {!el.isVisible && <span className="element-status">(hidden)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
