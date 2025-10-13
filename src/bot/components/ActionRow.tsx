import * as React from "react"
import { memo, useCallback, useMemo } from "react"
import type { ActionConfig } from "../logic/Config.ts"
import { useDispatch } from "../BotManagerContext.tsx"
import { useActionValue } from "../logic/ActionsManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { FoundElementsList } from "./FoundElementsList.tsx"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"
import { ScriptInput } from "../script/ScriptInput.tsx"
import { XPathInput } from "../xpath/XPathInput.tsx"
import { ElementsInfoKey } from "../logic/ElementsObserver.ts"

interface ActionConfigRowProps {
  action: ActionConfig
  index: number
}

export const ActionRow = memo(({ action, index }: ActionConfigRowProps) => {
  const dispatch = useDispatch()

  const actionValue = useActionValue(action.id)
  const statusLine = !actionValue.ok ? actionValue.error : undefined
  const statusType = !actionValue.ok ? actionValue.severity : undefined

  function handleInputChange(field: keyof ActionConfig): (e: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void {
    return e => {
      const value = typeof e === "string"
        ? e
        : e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.type === "number"
            ? Number(e.target.value) || 0
            : e.target.value

      dispatch.config.updateAction(action.id, { [field]: value })
    }
  }

  const onScriptChange = useCallback((value: string) => {
    dispatch.config.updateAction(action.id, { script: value })
  }, [action.id, dispatch])

  const elementsInfo = actionValue.attachments.get(ElementsInfoKey)
  const elements = useMemo(() => {
    if (actionValue.ok) {
      return elementsInfo
        .filter(e => e.isVisible)
        .map(e => e.element)
    } else {
      return null
    }
  }, [actionValue, elementsInfo])

  const value = action.type === "xpath"
    ? (elements
      ? (elements.length === 1
        ? "1 element"
        : `${elements.length} elements`)
      : "(not resolved)")
    : action.type === "script"
      ? "script"
      : "unknown type"

  return (
    <ReorderableRow
      id={action.id}
      index={index}
      name={action.name}
      value={action.type === "xpath"
        ? (
          <HoverableElementHighlighter elements={elements ?? []}>
            <span className="variable-current-value">
              {value}
            </span>
          </HoverableElementHighlighter>
        )
        : (
          <span className="variable-current-value">
            {value}
          </span>
        )}
      handleRemove={dispatch.config.removeAction}
      askOnRemove={action.xpath.length > 0 || action.script.length > 0}
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

          <label className="label" htmlFor={`action-type-${action.id}`}>Type</label>
          <select
            id={`action-type-${action.id}`}
            value={action.type}
            onChange={handleInputChange("type")}
          >
            <option value="xpath">XPath</option>
            <option value="script">Script</option>
          </select>

          {action.type === "xpath"
            ? (
              <>
                <label className="label" htmlFor={`action-xpath-${action.id}`}>XPath</label>
                <XPathInput
                  id={`action-xpath-${action.id}`}
                  value={action.xpath}
                  onChange={handleInputChange("xpath")}
                />

                <label className="label" htmlFor={`action-allowMultiple-${action.id}`}>Allow multiple</label>
                <input
                  type="checkbox"
                  id={`action-allowMultiple-${action.id}`}
                  checked={action.allowMultiple}
                  onChange={handleInputChange("allowMultiple")}
                />
              </>
            )
            : action.type === "script"
              ? (
                <>
                  <label className="label" htmlFor={`action-script-${action.id}`}>Script</label>
                  <ScriptInput
                    id={`action-script-${action.id}`}
                    value={action.script}
                    onChange={onScriptChange}
                  />
                </>
              )
              : null}

          <label className="label" htmlFor={`action-periodic-${action.id}`}>Periodic</label>
          <input
            type="checkbox"
            id={`action-periodic-${action.id}`}
            checked={action.periodic}
            onChange={handleInputChange("periodic")}
          />

          {action.periodic && (
            <>
              <label className="label" htmlFor={`action-interval-${action.id}`}>Interval (ms)</label>
              <input
                type="number"
                id={`action-interval-${action.id}`}
                value={action.interval}
                onChange={handleInputChange("interval")}
              />
            </>
          )}
        </>
      )}
      additionalContent={(
        <>
          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}

          {action.type === "xpath" && (
            <FoundElementsList elements={actionValue.attachments.get(ElementsInfoKey) ?? []} />
          )}
        </>
      )}
    />
  )
})
