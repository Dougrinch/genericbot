import * as React from "react"
import { type PropsWithChildren, useRef, useState } from "react"

export function BotPanel({ children }: PropsWithChildren) {
  const [position, setPosition] = useState({ bottom: 10, right: 10 })
  const dragRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, bottom: 0, right: 0 })

  const onDragStart = (e: React.MouseEvent) => {
    if (!dragRef.current) return

    // Only allow dragging when clicking directly on the panel, not on interactive elements
    const target = e.target as HTMLElement
    const isInteractiveElement = target.tagName.toLowerCase() === "button"
      || target.tagName.toLowerCase() === "input"
      || target.tagName.toLowerCase() === "select"
      || target.tagName.toLowerCase() === "textarea"
      || target.closest("button, input, select, textarea") != null

    if (isInteractiveElement) return

    isDragging.current = true
    const rect = dragRef.current.getBoundingClientRect()

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

  return (
    <div
      ref={dragRef}
      className="panel"
      style={{
        bottom: `${position.bottom}px`,
        right: `${position.right}px`
      }}
      onMouseDown={onDragStart}
    >
      {children}
    </div>
  )
}
