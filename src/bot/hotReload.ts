import { dispatch } from "./logic/BotManager.ts"

export type HotReloadInfo = {
  activePills: string[]
}

const CONFIG_HOT_RELOAD_KEY = "autoclick.hotreload.v1"

export function readAndClearHotReloadInfo(): HotReloadInfo | undefined {
  const stored = localStorage.getItem(CONFIG_HOT_RELOAD_KEY)
  if (stored !== null) {
    localStorage.removeItem(CONFIG_HOT_RELOAD_KEY)
    return JSON.parse(stored) as HotReloadInfo
  } else {
    return undefined
  }
}

function saveHotReloadInfo(info: HotReloadInfo): void {
  localStorage.setItem(CONFIG_HOT_RELOAD_KEY, JSON.stringify(info))
}

export function hotReload(root: HTMLElement) {
  void asyncHotReload(root)
}

async function asyncHotReload(root: HTMLElement) {
  const response = await fetch("https://dougrinch.com/genericbot/bot.iife.js")
  const code = await response.text()

  if (!code || !code.trim()) {
    console.warn("Clipboard is empty or blocked. Copy the updated AutoClick script first.")
    return
  }

  if (code.length > 1024 * 1024) {
    console.warn("Clipboard content is too long. Copy the updated AutoClick script first.")
    return
  }

  if (!code.startsWith("(function(){")) {
    console.warn("Clipboard content is not a valid AutoClick script. Copy the updated AutoClick script first.")
    return
  }

  saveHotReloadInfo({
    activePills: []
  })

  dispatch.close()
  root.remove()

  setTimeout(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
      new Function(code)()
      console.warn("AutoClick script reloaded")
    } catch (e: unknown) {
      console.error("AutoClick reload error", e)
    }
  }, 0)
}
