import * as React from "react"

interface BotHeaderProps {
  onDragStart: (e: React.MouseEvent) => void
}

export function BotHeader({ onDragStart }: BotHeaderProps) {
  return (
    <div className="header">
      <div>AutoClick</div>
      <div className="drag" title="Drag" onMouseDown={onDragStart}>⠿</div>
    </div>
  )
}
