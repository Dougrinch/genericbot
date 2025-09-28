import * as React from "react"
import { type ReactNode, useEffect, useState } from "react"
import { useReorderableListContext } from "./ReorderableListContext.ts"

export type ReorderableRowProps = {
  id: string
  index: number
  name: string
  value?: ReactNode
  summaryValue?: ReactNode
  handleRemove: (id: string) => void
  askOnRemove: boolean
  fields: ReactNode
  additionalContent?: ReactNode
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

  const [isEditing, setIsEditing] = useState(!props.name)

  if (!isEditing) {
    return (
      <div
        ref={ref}
        className={`reorderable-item ${isDragging ? "dragging" : ""}`}
        id={`${rowIdPrefix}-${props.id}`}
      >
        <div
          className="reorderable-item-row-icon reorderable-item-drag-handle"
          draggable={false}
          onMouseDown={e => {
            setIsDragging(true)
            onDragStart(e)
          }}
        >
          <div className="dot"></div>
        </div>

        <div className="reorderable-item-info">
          <span className="reorderable-item-name">
            {props.name || "Unnamed"}
          </span>
          {props.value !== undefined && (
            <div className="reorderable-item-value">
              {props.value}
            </div>
          )}
        </div>

        <button className="reorderable-item-edit-btn" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </div>
    )
  } else {
    return (
      <div ref={ref} className="reorderable-item editing" id={`${rowIdPrefix}-${props.id}`}>
        <div className="reorderable-item-summary">
          <span className="reorderable-item-summary-info">
            <span style={{ fontWeight: "bold" }}>
              {props.name || "Unnamed"}
            </span>
            {props.summaryValue !== undefined && (
              <span className="reorderable-item-summary-value"> — {props.summaryValue}</span>
            )}
          </span>
          <button
            className="reorderable-item-remove-btn"
            onClick={() => {
              if (props.askOnRemove) {
                if (confirm(`Remove "${props.name}"`)) {
                  props.handleRemove(props.id)
                }
              } else {
                props.handleRemove(props.id)
              }
            }}
          >
            Remove
          </button>
          <button className="reorderable-item-edit-btn" onClick={() => setIsEditing(false)}>
            Done
          </button>
        </div>

        <div className="reorderable-item-fields">
          {props.fields}
        </div>

        {props.additionalContent !== undefined && (
          <div className="reorderable-item-additional">
            {props.additionalContent}
          </div>
        )}
      </div>
    )
  }
}
