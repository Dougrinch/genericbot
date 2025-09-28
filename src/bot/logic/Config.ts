import { enableMapSet, type Immutable } from "immer"

enableMapSet()

export type Config = Immutable<{
  entries: EntryConfig[]
  variables: VariableConfig[]
  buttons: ButtonConfig[]
}>

export type EntryConfig = Immutable<{
  id: string
  name: string
  xpath: string
  interval: number
  condition?: string
  allowMultiple: boolean
}>

export type VariableConfig = Immutable<{
  id: string
  name: string
  xpath: string
  regex: string
  type: "number" | "string"
}>

export type ButtonConfig = Immutable<{
  id: string
  name: string
  xpath: string
  allowMultiple: boolean
}>
