import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { ActionsManager } from "./ActionsManager.ts"
import { ElementsManager } from "./ElementsManager.ts"
import { XPathSubscriptionManager } from "./XPathSubscriptionManager.ts"


export class BotManager {
  readonly listeners = new Set<() => void>([])

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

  subscribe(onChange: () => void): () => void {
    this.listeners.add(onChange)
    return () => {
      this.listeners.delete(onChange)
    }
  }

  notifyListeners(): void {
    this.listeners.forEach(onChange => onChange())
  }
}
