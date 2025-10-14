import { enableMapSet, type Immutable } from "immer"

enableMapSet()

export type Config = Immutable<{
  actions: ActionConfig[]
  variables: VariableConfig[]
  elements: ElementConfig[]
}>

export type ActionConfig = Immutable<{
  id: string
  name: string
  type: "xpath" | "script" | "element"
  xpath: string
  script: string
  element: string
  periodic: boolean
  interval: number
  allowMultiple: boolean
}>

export type VariableConfig = Immutable<{
  id: string
  name: string
  elementType: "xpath" | "element"
  xpath: string
  element: string
  regex: string
  type: "number" | "string"
}>

export type ElementConfig = Immutable<{
  id: string
  name: string
  xpath: string
  allowMultiple: boolean
  includeInvisible: boolean
}>
