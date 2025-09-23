import * as React from "react"
import { type ReactNode, useEffect, useState } from "react"
import { useReorderableListContext } from "./ReorderableListContext.ts"

export type ReorderableRowProps = {
  id: string
  index: number
  isEditing: boolean
  foldedRow: ReactNode
  editableRow: ReactNode
}

export function ReorderableRow(props: ReorderableRowProps) {
  const [isDragging, setIsDragging] = useState(false)

  const ctx = useReorderableListContext()

  const onDragStart = ctx.onDragStart(props.index, props.id)
  const ref = ctx.getRowRef(props.id)
  const onDragStop = ctx.setOnDragStop(props.id)
  const rowIdPrefix = ctx.rowIdPrefix

  useEffect(() => {
    onDragStop(() => {
      setIsDragging(false)
    })
  }, [onDragStop])

  if (props.isEditing) {
    return (
      <div ref={ref} className="reorderable-item editing" id={`${rowIdPrefix}-${props.id}`}>
        {props.editableRow}
      </div>
    )
  } else {
    return (
      <div
        ref={ref}
        className={`reorderable-item ${isDragging ? "dragging" : ""}`}
        id={`${rowIdPrefix}-${props.id}`}
      >
        <div
          className="reorderable-item-drag-handle"
          draggable={false}
          onMouseDown={e => {
            setIsDragging(true)
            onDragStart(e)
          }}
        >
          <div className="dot"></div>
        </div>

        {props.foldedRow}
      </div>
    )
  }
}
