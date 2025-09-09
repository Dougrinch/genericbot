import { EntryRow } from "./EntryRow"
import { useConfig } from "../BotStateHooks.tsx"

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
