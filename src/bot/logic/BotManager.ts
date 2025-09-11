import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { createManagerStore } from "../../utils/ManagerStore.ts"


export function useConfigManager<T>(selector: (cm: ConfigManager) => T): T {
  return store.useStoreState(bm => selector(bm.config))
}

export function useVariablesManager<T>(selector: (vm: VariablesManager) => T): T {
  return store.useStoreState(bm => selector(bm.variables))
}


export class BotManager {
  readonly config: ConfigManager
  readonly variables: VariablesManager

  constructor() {
    this.config = new ConfigManager(this)
    this.variables = new VariablesManager(this)
  }

  resetConfig(): void {
    this.config.reset()
  }

  init(): void {
    this.variables.resetAll()
  }

  stop(): void {
    this.variables.clearAllObservers()
  }
}


const store = createManagerStore(() => new BotManager())
export const dispatch = store.dispatch
