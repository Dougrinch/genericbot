import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { EntriesManager } from "./EntriesManager.ts"
import { ButtonsManager } from "./ButtonsManager.ts"
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

export function useButtonsManager<T>(selector: (bm: ButtonsManager) => T): T {
  return store.useStoreState(bm => selector(bm.buttons))
}


export class BotManager {
  readonly config: ConfigManager
  readonly xPathSubscriptionManager: XPathSubscriptionManager
  readonly variables: VariablesManager
  readonly entries: EntriesManager
  readonly buttons: ButtonsManager

  constructor() {
    this.config = new ConfigManager(this)
    this.xPathSubscriptionManager = new XPathSubscriptionManager()
    this.variables = new VariablesManager(this)
    this.entries = new EntriesManager(this)
    this.buttons = new ButtonsManager(this)
  }

  init(): void {
    this.xPathSubscriptionManager.init()
    this.variables.init()
    this.entries.init()
    this.buttons.init()
  }

  close(): void {
    this.variables.close()
    this.entries.close()
    this.buttons.close()
    this.xPathSubscriptionManager.close()
  }
}


const store = createManagerStore(() => new BotManager())
export const dispatch = store.dispatch
