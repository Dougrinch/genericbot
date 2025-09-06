import { EntryRow } from "./EntryRow"
import { useConfig } from "../BotStateContext.ts"

export function EntriesList() {
  const entries = useConfig(c => c.entries)

  return (
    <div className="entries">
      {entries.map(entry => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
