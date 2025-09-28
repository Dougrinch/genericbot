import * as React from "react"
import { memo } from "react"
import type { ButtonConfig } from "../logic/Config.ts"
import { useButtonValue } from "../logic/ButtonsManager.ts"
import { dispatch } from "../logic/BotManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"

interface ButtonRowProps {
  button: ButtonConfig
  index: number
}

export const ButtonRow = memo((props: ButtonRowProps) => {
  const button = props.button

  const [elements, statusLine, statusType] = useButtonValue(button.id)

  function handleInputChange(field: keyof ButtonConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch.config.updateButton(button.id, { [field]: value })
    }
  }

  const value = elements !== undefined
    ? (elements.length === 1
      ? "1 element"
      : `${elements.length} elements`)
    : "(not resolved)"

  return (
    <ReorderableRow
      id={button.id}
      index={props.index}
      name={button.name}
      value={(
        <>
          <span className="variable-current-value">
            {value}
          </span>
        </>
      )}
      summaryValue={value}
      handleRemove={dispatch.config.removeButton}
      fields={(
        <>
          <label className="label" htmlFor={`btn-name-${button.id}`}>Name</label>
          <input
            type="text"
            id={`btn-name-${button.id}`}
            placeholder="Button name"
            value={button.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`btn-xpath-${button.id}`}>XPath</label>
          <textarea
            id={`btn-xpath-${button.id}`}
            className="auto-resize"
            placeholder="XPath — will select button elements"
            value={button.xpath}
            onChange={handleInputChange("xpath")}
          />

          <label className="label" htmlFor={`btn-allowMultiple-${button.id}`}>Allow Multiple</label>
          <input
            type="checkbox"
            id={`btn-allowMultiple-${button.id}`}
            checked={button.allowMultiple}
            onChange={handleInputChange("allowMultiple")}
          />

          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}
        </>
      )}
    />
  )
})
