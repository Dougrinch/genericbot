import * as React from "react"
import { memo, useMemo } from "react"
import type { ActionConfig } from "../logic/Config.ts"
import { dispatch } from "../logic/BotManager.ts"
import { useActionValue } from "../logic/ActionsManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { FoundElementsList } from "./FoundElementsList.tsx"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"

interface ActionConfigRowProps {
  action: ActionConfig
  index: number
}

export const ActionRow = memo(({ action, index }: ActionConfigRowProps) => {
  const actionValue = useActionValue(action.id)
  const statusLine = actionValue?.statusLine
  const statusType = actionValue?.statusType

  function handleInputChange(field: keyof ActionConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch.config.updateAction(action.id, { [field]: value })
    }
  }

  const elements = useMemo(() => {
    if (statusType === "ok") {
      return (actionValue?.elementsInfo ?? [])
        .filter(e => e.isVisible)
        .map(e => e.element)
    } else {
      return null
    }
  }, [actionValue?.elementsInfo, statusType])

  const value = elements
    ? (elements.length === 1
      ? "1 element"
      : `${elements.length} elements`)
    : "(not resolved)"

  return (
    <ReorderableRow
      id={action.id}
      index={index}
      name={action.name}
      value={(
        <HoverableElementHighlighter elements={elements ?? []}>
          <span className="variable-current-value">
            {value}
          </span>
        </HoverableElementHighlighter>
      )}
      handleRemove={dispatch.config.removeAction}
      askOnRemove={action.xpath.length > 0 || (action.condition?.length ?? 0) > 0}
      fields={(
        <>
          <label className="label" htmlFor={`action-name-${action.id}`}>Name</label>
          <input
            type="text"
            id={`action-name-${action.id}`}
            placeholder="Dig"
            value={action.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`action-xpath-${action.id}`}>XPath</label>
          <textarea
            id={`action-xpath-${action.id}`}
            className="auto-resize"
            placeholder="//button[@id='dig']"
            value={action.xpath}
            onChange={handleInputChange("xpath")}
          />

          <label className="label" htmlFor={`action-interval-${action.id}`}>Interval (ms)</label>
          <input
            type="number"
            id={`action-interval-${action.id}`}
            value={action.interval}
            onChange={handleInputChange("interval")}
          />

          <label className="label" htmlFor={`action-condition-${action.id}`}>Condition</label>
          <input
            type="text"
            id={`action-condition-${action.id}`}
            placeholder="score > 100 && lives >= 3"
            value={action.condition != null ? action.condition : ""}
            onChange={handleInputChange("condition")}
          />

          <label className="label" htmlFor={`action-allowMultiple-${action.id}`}>Allow multiple</label>
          <input
            type="checkbox"
            id={`action-allowMultiple-${action.id}`}
            checked={action.allowMultiple}
            onChange={handleInputChange("allowMultiple")}
          />
        </>
      )}
      additionalContent={(
        <>
          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}

          <FoundElementsList elements={actionValue?.elementsInfo ?? []} />
        </>
      )}
    />
  )
})
