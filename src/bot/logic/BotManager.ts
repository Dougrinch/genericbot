import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { ActionsManager } from "./ActionsManager.ts"
import { ElementsManager } from "./ElementsManager.ts"
import { XPathSubscriptionManager } from "./XPathSubscriptionManager.ts"
import { ScriptRunner } from "../script/ScriptRunner.ts"


export class BotManager {
  readonly config: ConfigManager
  readonly xPathSubscriptionManager: XPathSubscriptionManager
  readonly variables: VariablesManager
  readonly actions: ActionsManager
  readonly elements: ElementsManager
  readonly scriptRunner: ScriptRunner

  constructor() {
    this.config = new ConfigManager()
    this.xPathSubscriptionManager = new XPathSubscriptionManager()
    this.variables = new VariablesManager(this)
    this.actions = new ActionsManager(this)
    this.elements = new ElementsManager(this)
    this.scriptRunner = new ScriptRunner(this)
  }

  init(): void {
    this.actions.init()
  }

  close(): void {
    this.actions.close()
  }
}
