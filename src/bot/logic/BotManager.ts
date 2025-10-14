import { ConfigManager } from "./ConfigManager.ts"
import { VariablesManager } from "./VariablesManager.ts"
import { ActionsManager } from "./ActionsManager.ts"
import { ElementsManager } from "./ElementsManager.ts"
import { ScriptActionFactory } from "../script/ScriptActionFactory.ts"


export class BotManager {
  readonly config: ConfigManager
  readonly variables: VariablesManager
  readonly actions: ActionsManager
  readonly elements: ElementsManager
  readonly scriptActionFactory: ScriptActionFactory

  constructor() {
    this.config = new ConfigManager()
    this.variables = new VariablesManager(this)
    this.actions = new ActionsManager(this)
    this.elements = new ElementsManager(this)
    this.scriptActionFactory = new ScriptActionFactory(this)
  }

  init(): void {
    this.actions.init()
  }

  close(): void {
    this.actions.close()
  }
}
