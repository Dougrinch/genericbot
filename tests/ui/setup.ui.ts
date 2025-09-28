import { cleanup, configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach, vi } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.tsx"
import { installCustomMatchers } from "./matchers.ts"
import { page } from "@vitest/browser/context"
import { dispatch as gameDispatch } from "../../src/game/GameStateContext.ts"
import type { Config } from "../../src/bot/logic/Config.ts"
import { CONFIG_STORAGE_KEY } from "../../src/bot/logic/ConfigManager.ts"
import { dispatch } from "../../src/bot/logic/BotManager.ts"

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
  vi.useFakeTimers()
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
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  dispatch.config.reload()
}

function initialBotConfig(): Config {
  return {
    entries: [
      {
        id: "entry_1",
        name: "Dig",
        xpath: "//button[starts-with(., 'Dig for')]",
        interval: 100,
        condition: "",
        allowMultiple: false
      },
      {
        id: "entry_2",
        name: "Buy Gnome",
        xpath: "//button[starts-with(., 'Buy Gnome')]",
        interval: 100,
        condition: "",
        allowMultiple: false
      },
      {
        id: "entry_3",
        name: "Buy Snow White",
        xpath: "//button[starts-with(., 'Buy Snow White')]",
        interval: 100,
        condition: "",
        allowMultiple: false
      }
    ],
    variables: [
      {
        id: "var_1",
        name: "score",
        xpath: "//span[@id='score']",
        regex: "",
        type: "number"
      },
      {
        id: "var_2",
        name: "lives",
        xpath: "//div[@class='lives']",
        regex: "(\\d+)",
        type: "number"
      },
      {
        id: "var_3",
        name: "name",
        xpath: "//div[@id='name']",
        regex: "",
        type: "string"
      },
      {
        id: "var_4",
        name: "Gold",
        xpath: "//div[starts-with(., 'Gold:')][not(.//div[starts-with(., 'Gold:')])]",
        regex: "Gold: (\\d+)",
        type: "number"
      }
    ],
    buttons: [
      {
        id: "btn_1",
        name: "Dig",
        xpath: "//button[starts-with(., 'Dig for')]",
        allowMultiple: false
      },
      {
        id: "btn_2",
        name: "Buy Gnome",
        xpath: "//button[starts-with(., 'Buy Gnome')]",
        allowMultiple: false
      },
      {
        id: "btn_3",
        name: "Buy All",
        xpath: "//button[starts-with(., 'Buy')]",
        allowMultiple: true
      }
    ]
  }
}
