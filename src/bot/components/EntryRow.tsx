import * as React from "react"
import { useState } from "react"
import type { EntryConfig } from "../Config.ts"
import { dispatch } from "../ConfigContext.ts"

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
    <div className="entry" data-entry-id={entry.id}>
      <div className="label">Name</div>
      <input
        type="text"
        placeholder="Dig"
        value={entry.name}
        onChange={handleInputChange("name")}
      />

      <div className="label">XPath</div>
      <input
        type="text"
        placeholder="//button[@id='dig']"
        value={entry.xpath}
        onChange={handleInputChange("xpath")}
      />

      <div className="label">Interval (ms)</div>
      <input
        type="number"
        value={entry.interval}
        onChange={handleInputChange("interval")}
      />

      <div className="label">Condition</div>
      <input
        type="text"
        placeholder="score > 100 && lives >= 3"
        value={entry.condition || ""}
        onChange={handleInputChange("condition")}
      />

      <div className="label">Allow multiple</div>
      <div className="inline">
        <input
          type="checkbox"
          checked={!!entry.allowMultiple}
          onChange={handleInputChange("allowMultiple")}
        />
        <div className="label" style={{ visibility: entry.allowMultiple ? "visible" : "hidden" }}>
          Update every (ms)
        </div>
        <input
          type="number"
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
