import * as React from "react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { useReorderableListContext } from "./ReorderableListContext.ts"

export type ReorderableRowProps = {
  id: string
  isNew?: boolean
  index: number
  name: string
  value?: ReactNode
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

  const [isEditing, setIsEditing] = useState(!props.name || (props.isNew === true) || false)

  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isConfirmingRemove) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (removeButtonRef.current && !removeButtonRef.current.contains(event.target as Node)) {
        setIsConfirmingRemove(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isConfirmingRemove])

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
          <div className="reorderable-item-summary-info">
            <span className="reorderable-item-summary-name">
              {props.name || "Unnamed"}
            </span>
            {props.value !== undefined && (
              <div className="reorderable-item-summary-value">{props.value}</div>
            )}
          </div>
          <button
            ref={removeButtonRef}
            className="reorderable-item-remove-btn"
            onClick={e => {
              if (props.askOnRemove) {
                if (isConfirmingRemove) {
                  props.handleRemove(props.id)
                  setIsConfirmingRemove(false)
                } else {
                  e.stopPropagation()
                  setIsConfirmingRemove(true)
                }
              } else {
                props.handleRemove(props.id)
              }
            }}
          >
            {isConfirmingRemove ? "Confirm?" : "Remove"}
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
