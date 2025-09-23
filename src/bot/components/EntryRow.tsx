import * as React from "react"
import type { EntryConfig } from "../logic/Config.ts"
import { dispatch } from "../logic/BotManager.ts"
import { useEntryValue } from "../logic/EntriesManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"

interface EntryRowProps {
  entry: EntryConfig
  index: number
}

export function EntryRow({ entry, index }: EntryRowProps) {
  const [statusLine, statusType] = useEntryValue(entry.id)

  function handleInputChange(field: keyof EntryConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch.config.updateEntry(entry.id, { [field]: value })
    }
  }

  return (
    <ReorderableRow
      id={entry.id}
      index={index}
      name={entry.name}
      handleRemove={dispatch.config.removeEntry}
      fields={(
        <>
          <label className="label" htmlFor={`entry-name-${entry.id}`}>Name</label>
          <input
            type="text"
            id={`entry-name-${entry.id}`}
            placeholder="Dig"
            value={entry.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`entry-xpath-${entry.id}`}>XPath</label>
          <textarea
            id={`entry-xpath-${entry.id}`}
            className="auto-resize"
            placeholder="//button[@id='dig']"
            value={entry.xpath}
            onChange={handleInputChange("xpath")}
          />

          <label className="label" htmlFor={`entry-interval-${entry.id}`}>Interval (ms)</label>
          <input
            type="number"
            id={`entry-interval-${entry.id}`}
            value={entry.interval}
            onChange={handleInputChange("interval")}
          />

          <label className="label" htmlFor={`entry-condition-${entry.id}`}>Condition</label>
          <input
            type="text"
            id={`entry-condition-${entry.id}`}
            placeholder="score > 100 && lives >= 3"
            value={entry.condition != null ? entry.condition : ""}
            onChange={handleInputChange("condition")}
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
}
