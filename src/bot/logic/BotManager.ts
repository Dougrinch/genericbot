import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { ActionsManager } from "./ActionsManager.ts"
import { ElementsManager } from "./ElementsManager.ts"
import { createManagerStore } from "../../utils/ManagerStore.ts"
import { XPathSubscriptionManager } from "./XPathSubscriptionManager.ts"

export function useConfigManager<T>(selector: (cm: ConfigManager) => T): T {
  return store.useStoreState(bm => selector(bm.config))
}

export function useVariablesManager<T>(selector: (vm: VariablesManager) => T): T {
  return store.useStoreState(bm => selector(bm.variables))
}

export function useActionsManager<T>(selector: (am: ActionsManager) => T): T {
  return store.useStoreState(bm => selector(bm.actions))
}

export function useElementsManager<T>(selector: (em: ElementsManager) => T): T {
  return store.useStoreState(bm => selector(bm.elements))
}


export class BotManager {
  readonly config: ConfigManager
  readonly xPathSubscriptionManager: XPathSubscriptionManager
  readonly variables: VariablesManager
  readonly actions: ActionsManager
  readonly elements: ElementsManager

  constructor() {
    this.config = new ConfigManager(this)
    this.xPathSubscriptionManager = new XPathSubscriptionManager()
    this.variables = new VariablesManager(this)
    this.actions = new ActionsManager(this)
    this.elements = new ElementsManager(this)
  }

  init(): void {
    this.xPathSubscriptionManager.init()
    this.variables.init()
    this.actions.init()
    this.elements.init()
  }

  close(): void {
    this.variables.close()
    this.actions.close()
    this.elements.close()
    this.xPathSubscriptionManager.close()
  }
}


const store = createManagerStore(() => new BotManager())
export const dispatch = store.dispatch
