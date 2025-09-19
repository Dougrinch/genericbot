import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { EntriesManager } from "./EntriesManager.ts"
import { createManagerStore } from "../../utils/ManagerStore.ts"
import { XPathSubscriptionManager } from "./XPathSubscriptionManager.ts"

export function useConfigManager<T>(selector: (cm: ConfigManager) => T): T {
  return store.useStoreState(bm => selector(bm.config))
}

export function useVariablesManager<T>(selector: (vm: VariablesManager) => T): T {
  return store.useStoreState(bm => selector(bm.variables))
}

export function useEntriesManager<T>(selector: (em: EntriesManager) => T): T {
  return store.useStoreState(bm => selector(bm.entries))
}


export class BotManager {
  readonly config: ConfigManager
  readonly xPathSubscriptionManager: XPathSubscriptionManager
  readonly variables: VariablesManager
  readonly entries: EntriesManager

  constructor() {
    this.config = new ConfigManager(this)
    this.xPathSubscriptionManager = new XPathSubscriptionManager()
    this.variables = new VariablesManager(this)
    this.entries = new EntriesManager(this)
  }

  resetConfig(): void {
    this.config.reset()
  }

  init(): void {
    this.xPathSubscriptionManager.init()
    this.variables.init()
    this.entries.init()
  }

  close(): void {
    this.variables.close()
    this.entries.close()
    this.xPathSubscriptionManager.close()
  }
}


const store = createManagerStore(() => new BotManager())
export const dispatch = store.dispatch
