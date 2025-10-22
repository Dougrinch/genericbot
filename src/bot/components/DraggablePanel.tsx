import * as React from "react"
import { type PropsWithChildren, type RefObject, useRef, useState } from "react"

function useDrag(panelRef: RefObject<HTMLDivElement | null>) {
  const [position, setPosition] = useState({ bottom: 10, right: 10 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, bottom: 0, right: 0 })

  const onDragStart = (e: React.MouseEvent) => {
    if (!panelRef.current) return

    // Only allow dragging when clicking directly on the panel, not on interactive elements
    const target = e.target as HTMLElement
    const isInteractiveElement = target.tagName.toLowerCase() === "button"
      || target.tagName.toLowerCase() === "input"
      || target.tagName.toLowerCase() === "select"
      || target.tagName.toLowerCase() === "textarea"
      || (target.tagName.toLowerCase() === "div" && target.classList.contains("cm-editor"))
      || target.closest("button, input, select, textarea, div.cm-editor") != null

    if (isInteractiveElement) return

    isDragging.current = true
    const rect = panelRef.current.getBoundingClientRect()

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: window.innerHeight - rect.bottom,
      right: window.innerWidth - rect.right
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - dragStart.current.x
      const deltaY = e.clientY - dragStart.current.y

      setPosition({
        bottom: Math.max(0, dragStart.current.bottom - deltaY),
        right: Math.max(0, dragStart.current.right - deltaX)
      })
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    e.preventDefault()
  }

  return {
    position, onDragStart
  }
}

export function DraggablePanel(props: PropsWithChildren) {
  const panelRef = useRef<HTMLDivElement>(null)

  const drag = useDrag(panelRef)

  return (
    <div
      ref={panelRef}
      className="panel"
      style={{
        bottom: `${drag.position.bottom}px`,
        right: `${drag.position.right}px`
      }}
      onMouseDown={drag.onDragStart}
    >
      {props.children}
    </div>
  )
}
