import { EntryRow } from "./EntryRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { dispatch } from "../logic/BotManager.ts"

export function EntriesList() {
  const entries = useConfig(c => c.entries)

  return (
    <ReorderableList
      rowIdPrefix="entry"
      handleReorder={dispatch.config.reorderEntries}
      addButtonLabel="Add Entry"
      addButtonOnClick={() => dispatch.config.addEntry()}
    >
      {entries.map((entry, index) => (
        <EntryRow
          key={entry.id}
          index={index}
          entry={entry}
        />
      ))}
    </ReorderableList>
  )
}
