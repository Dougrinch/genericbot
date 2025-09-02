import type { Draft, Immutable } from "immer"

export type Config = Immutable<{
  enabled: boolean
}>

export function initialBotState(): Config {
  return {
    enabled: false
  }
}

export const configUpdaters = {
  buttonClicked(config: Draft<Config>) {
    config.enabled = !config.enabled
  }
}
