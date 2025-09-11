import { EntryRow } from "./EntryRow"
import { useConfig } from "../logic/ConfigManager.ts"

export function EntriesList() {
  const entries = useConfig(c => c.entries)

  return (
    <div className="entries">
      {Array.from(entries.values()).map(entry => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
