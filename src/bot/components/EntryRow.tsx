import * as React from "react"
import { useState } from "react"
import type { EntryConfig } from "../BotState.ts"
import { dispatch } from "../BotStateContext.ts"

interface EntryRowProps {
  entry: EntryConfig
}

export function EntryRow({ entry }: EntryRowProps) {
  const [statusLine] = useState("Provide an XPath to bind.")
  const [statusType] = useState<"warn" | "ok" | "err">("warn")

  function handleInputChange(field: keyof EntryConfig): (e: React.ChangeEvent<HTMLInputElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? e.target.checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch({ type: "updateEntry", id: entry.id, updates: { [field]: value } })
    }
  }

  return (
    <div className="entry" id={`entry-${entry.id}`}>
      <label className="label" htmlFor={`entry-name-${entry.id}`}>Name</label>
      <input
        type="text"
        id={`entry-name-${entry.id}`}
        placeholder="Dig"
        value={entry.name}
        onChange={handleInputChange("name")}
      />

      <label className="label" htmlFor={`entry-xpath-${entry.id}`}>XPath</label>
      <input
        type="text"
        id={`entry-xpath-${entry.id}`}
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
        value={entry.condition || ""}
        onChange={handleInputChange("condition")}
      />

      <label className="label" htmlFor={`entry-allowMultiple-${entry.id}`}>Allow multiple</label>
      <div className="inline">
        <input
          type="checkbox"
          id={`entry-allowMultiple-${entry.id}`}
          checked={!!entry.allowMultiple}
          onChange={handleInputChange("allowMultiple")}
        />
        <label
          className="label"
          htmlFor={`entry-updateEvery-${entry.id}`}
          style={{ visibility: entry.allowMultiple ? "visible" : "hidden" }}
        >
          Update every (ms)
        </label>
        <input
          type="number"
          id={`entry-updateEvery-${entry.id}`}
          min="100"
          value={entry.updateEvery || 1000}
          onChange={handleInputChange("updateEvery")}
          style={{ visibility: entry.allowMultiple ? "visible" : "hidden" }}
        />
      </div>

      <div className={`statusline status-${statusType}`}>
        {statusLine}
      </div>

      <div className="row-full">
        <button onClick={() => dispatch({ type: "removeEntry", id: entry.id })}>
          Remove
        </button>
      </div>
    </div>
  )
}
