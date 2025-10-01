import type { BotManager } from "./BotManager.ts"

export class ScriptRunner {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  run(script: string, signal: AbortSignal): Promise<void> {
    const context = {
      click: this.click.bind(this),
      repeat: this.repeat.bind(this),
      wait: this.wait.bind(this),
      signal
    }

    let scriptCode = `return (async function ({${Object.keys(context).join(", ")}}) {
      ${script}
    })`

    scriptCode = this.fixOffsets(scriptCode, script)
    for (const func of Object.keys(context)) {
      scriptCode = scriptCode.replace(new RegExp(`${func}\\(`, "g"), `await ${func}(`)
    }
    scriptCode = scriptCode.replace(/await repeat\((\d+)\) \{/g, "await repeat($1, async (i) => {")
    scriptCode = scriptCode.replace(/await wait\((\d+)\)/g, "await wait($1, signal)")

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
      const scriptFunction = new Function(scriptCode)() as (ctx: typeof context) => Promise<void>
      return scriptFunction(context)
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject(e)
    }
  }

  private fixOffsets(script: string, originalScript: string): string {
    const lines = script.split("\n")

    const sourceOffset = lines[lines.length - 1].indexOf("}")
    lines[1] = lines[1].substring(sourceOffset)
    lines[lines.length - 1] = lines[lines.length - 1].substring(sourceOffset)

    const scriptOffset = lines[1].indexOf(originalScript.split("\n")[0])
    const scriptPrefix = Array(scriptOffset + 1).join(" ")
    for (let i = 2; i < lines.length - 1; i++) {
      lines[i] = scriptPrefix + lines[i]
    }

    return lines.join("\n")
  }

  private click(elementName: string) {
    const id = this.bot.config.getElementId(elementName)
    if (id !== undefined) {
      const elements = this.bot.elements.getValue(id)?.value
      if (elements) {
        for (const element of elements) {
          element.click()
        }
      }
    }
  }

  private async repeat(n: number, f: (i: number) => Promise<void>) {
    for (let i = 0; i < n; i++) {
      await f(i)
    }
  }

  private async wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
        return
      }

      let id: ReturnType<typeof setTimeout> | null = null

      function onAbort() {
        clearTimeout(id!)
        signal.removeEventListener("abort", onAbort)
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
      }

      signal.addEventListener("abort", onAbort, { once: true })

      id = setTimeout(() => {
        signal.removeEventListener("abort", onAbort)
        resolve()
      }, ms)
    })
  }
}
