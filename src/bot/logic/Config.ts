import { enableMapSet, type Immutable } from "immer"

enableMapSet()

export type Config = Immutable<{
  entries: Map<string, EntryConfig>
  variables: Map<string, VariableConfig>
}>

export type EntryConfig = Immutable<{
  id: string
  name: string
  xpath: string
  interval: number
  allowMultiple?: boolean
  updateEvery?: number
  condition?: string
}>

export type VariableConfig = Immutable<{
  id: string
  name: string
  xpath: string
  regex: string
  type: "number" | "string"
}>

export function initialBotConfig(): Config {
  return {
    entries: new Map([
      ["entry_1", {
        id: "entry_1",
        name: "111",
        xpath: "//button[@id='click-me']",
        interval: 1000,
        allowMultiple: false,
        updateEvery: 1000,
        condition: ""
      }],
      ["entry_2", {
        id: "entry_2",
        name: "222",
        xpath: "//div[@class='collectible']",
        interval: 2000,
        allowMultiple: true,
        updateEvery: 1500,
        condition: "score > 100"
      }]
    ]),
    variables: new Map([
      ["var_1", {
        id: "var_1",
        name: "score",
        xpath: "//span[@id='score']",
        regex: "",
        type: "number"
      }],
      ["var_2", {
        id: "var_2",
        name: "lives",
        xpath: "//div[@class='lives']",
        regex: "(\\d+)",
        type: "number"
      }],
      ["var_3", {
        id: "var_3",
        name: "name",
        xpath: "//div[@id='name']",
        regex: "",
        type: "string"
      }],
      ["var_4", {
        id: "var_4",
        name: "Gold",
        xpath: "//div[starts-with(., 'Gold')][not(.//div[starts-with(., 'Gold')])]",
        regex: "Gold: (\\d+)",
        type: "number"
      }]
    ])
  }
}
