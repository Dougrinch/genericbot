import { cleanup, configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach, vi } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.tsx"
import { installCustomMatchers } from "./matchers.ts"
import { page } from "@vitest/browser/context"
import { dispatch as gameDispatch } from "../../src/game/GameStateContext.ts"
import type { Config } from "../../src/bot/logic/Config.ts"
import { CONFIG_STORAGE_KEY } from "../../src/bot/logic/ConfigManager.ts"

configure({
  reactStrictMode: true
})

beforeAll(() => {
  enrichLocator()
  installCustomLocators()
  installCustomMatchers()
})

beforeEach(() => {
  cleanup()
  vi.resetModules()
  vi.resetAllMocks()

  document.head.innerHTML = ""
  document.body.innerHTML = "<div id=\"root\"></div>"

  resetConfig()
  gameDispatch({ type: "reset" })
})

afterEach(() => {
  page.getBySelector(".config-wrapper").query()?.scrollTo(0, 0)
  vi.useRealTimers()
})

function resetConfig(): void {
  const config = initialBotConfig()
  localStorage.setItem(CONFIG_STORAGE_KEY + "_" + window.location.href, JSON.stringify(config))
}

function initialBotConfig(): Config {
  return {
    actions: [
      {
        id: "action_1",
        name: "Dig",
        type: "xpath",
        xpath: "//button[starts-with(., 'Dig for')]",
        script: "",
        element: "",
        periodic: true,
        interval: 100,
        allowMultiple: false
      },
      {
        id: "action_2",
        name: "Buy Gnome",
        type: "xpath",
        xpath: "//button[starts-with(., 'Buy Gnome')]",
        script: "",
        element: "",
        periodic: true,
        interval: 100,
        allowMultiple: false
      },
      {
        id: "action_3",
        name: "Buy Snow White",
        type: "xpath",
        xpath: "//button[starts-with(., 'Buy Snow White')]",
        script: "",
        element: "",
        periodic: true,
        interval: 100,
        allowMultiple: false
      }
    ],
    variables: [
      {
        id: "var_1",
        name: "score",
        elementType: "xpath",
        xpath: "//span[@id='score']",
        element: "",
        regex: "",
        type: "number"
      },
      {
        id: "var_2",
        name: "lives",
        elementType: "xpath",
        xpath: "//div[@class='lives']",
        element: "",
        regex: "(\\d+)",
        type: "number"
      },
      {
        id: "var_3",
        name: "name",
        elementType: "xpath",
        xpath: "//div[@id='name']",
        element: "",
        regex: "",
        type: "string"
      },
      {
        id: "var_4",
        name: "Gold",
        elementType: "xpath",
        xpath: "//div[starts-with(., 'Gold:')][not(.//div[starts-with(., 'Gold:')])]",
        element: "",
        regex: "Gold: (\\d+)",
        type: "number"
      }
    ],
    elements: [
      {
        id: "elem_1",
        name: "Dig",
        xpath: "//button[starts-with(., 'Dig for')]",
        allowMultiple: false,
        includeInvisible: true
      },
      {
        id: "elem_2",
        name: "Buy Gnome",
        xpath: "//button[starts-with(., 'Buy Gnome')]",
        allowMultiple: false,
        includeInvisible: true
      },
      {
        id: "elem_3",
        name: "Buy All",
        xpath: "//button[starts-with(., 'Buy')]",
        allowMultiple: true,
        includeInvisible: true
      }
    ]
  }
}
