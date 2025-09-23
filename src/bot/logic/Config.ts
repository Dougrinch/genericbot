import { enableMapSet, type Immutable } from "immer"

enableMapSet()

export type Config = Immutable<{
  entries: EntryConfig[]
  variables: VariableConfig[]
}>

export type EntryConfig = Immutable<{
  id: string
  name: string
  xpath: string
  interval: number
  condition?: string
}>

export type VariableConfig = Immutable<{
  id: string
  name: string
  xpath: string
  regex: string
  type: "number" | "string"
}>
