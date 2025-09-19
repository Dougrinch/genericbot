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
        name: "Dig",
        xpath: "//button[starts-with(., 'Dig for')]",
        interval: 100,
        condition: ""
      }],
      ["entry_2", {
        id: "entry_2",
        name: "Buy Gnome",
        xpath: "//button[starts-with(., 'Buy Gnome')]",
        interval: 100,
        condition: ""
      }],
      ["entry_3", {
        id: "entry_3",
        name: "Buy Snow White",
        xpath: "//button[starts-with(., 'Buy Snow White')]",
        interval: 100,
        condition: ""
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
        xpath: "//div[starts-with(., 'Gold:')][not(.//div[starts-with(., 'Gold:')])]",
        regex: "Gold: (\\d+)",
        type: "number"
      }]
    ])
  }
}
