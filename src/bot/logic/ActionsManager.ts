import { type BotManager } from "./BotManager.ts"
import type { ActionConfig } from "./Config.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { mapResult, type Result, switchMapResult } from "../../utils/Result.ts"
import { BehaviorSubject, type Observable, of, type Subscription, tap } from "rxjs"
import type { RunnableScript } from "../script/ScriptRunner.ts"
import { splitMerge } from "../../utils/observables/SplitMerge.ts"
import { ObservableMap } from "../../utils/observables/ObservableMap.ts"
import { switchMap } from "rxjs/operators"


export function usePillStatus(id: string): PillStatus | undefined {
  return useBotObservable(m => m.actions.pillStatus(id), [id])
}

export function useActionValue(id: string): Result<unknown> {
  return useBotObservable(m => m.actions.value(id), [id])
}


type ActionData = {
  pillStatus: BehaviorSubject<PillStatus>

  script?: RunnableScript
  timerId?: number
  controller?: AbortController
}

type ActionDataWithScript = ActionData & Required<Pick<ActionData, "script">>

function hasScript(data: ActionData): data is ActionDataWithScript {
  return data.script !== undefined
}

type PillStatus = {
  isRunning: boolean
  status: "stopped" | "running" | "auto-stopped" | "waiting"
}


export class ActionsManager {
  private readonly bot: BotManager
  private readonly actions: ObservableMap<string, ActionData>

  private subscription?: Subscription

  constructor(botState: BotManager) {
    this.bot = botState
    this.actions = new ObservableMap()
  }

  pillStatus(id: string) {
    return this.actions.observe(id)
      .pipe(switchMap(data => {
        if (data) {
          return data.pillStatus
        } else {
          return of(undefined)
        }
      }))
  }

  init() {
    this.subscription = this.bot.config.actions()
      .pipe(
        splitMerge(
          actions => new Set(actions.map(p => p.id)),
          id => this.value(id)
            .pipe(tap({
              next: r => this.onScriptUpdate(id, r),
              unsubscribe: () => this.onScriptRemove(id)
            }))
        )
      ).subscribe()
  }

  private onScriptUpdate(id: string, r: Result<RunnableScript>) {
    this.onScriptRemove(id)

    const data: ActionData = {
      pillStatus: new BehaviorSubject<PillStatus>({
        isRunning: false,
        status: "stopped"
      }),
      script: r.ok ? r.value : undefined
    }
    this.actions.set(id, data)
  }

  private onScriptRemove(id: string) {
    const data = this.actions.get(id)
    if (data) {
      data.pillStatus.complete()
      this.stop(data)
      this.actions.delete(id)
    }
  }

  close() {
    this.subscription?.unsubscribe()
  }

  value(id: string): Observable<Result<RunnableScript>> {
    return this.bot.config.action(id)
      .pipe(
        switchMapResult(action => this.actionValue(action))
      )
  }

  private actionValue(action: ActionConfig): Observable<Result<RunnableScript>> {
    if (action.type === "xpath") {
      return this.bot.xPathSubscriptionManager
        .elements(action.xpath, true, action.allowMultiple)
        .pipe(mapResult(e => this.elementsAction(action, e)))
    } else if (action.type === "script") {
      return this.bot.scriptRunner
        .runnableScript(action)
    } else {
      throw new Error("Unreachable")
    }
  }

  elementsAction(action: ActionConfig, elements: HTMLElement[]): RunnableScript {
    return {
      run(): Promise<void> {
        try {
          for (const element of elements) {
            element.click()
          }
          return Promise.resolve()
        } catch (e) {
          return Promise.reject(e)
        }
      },
      periodic: action.periodic,
      interval: action.interval
    }
  }

  toggle(id: string) {
    const data = this.actions.get(id)
    if (!data) {
      throw Error(`ActionData ${id} not found`)
    }

    if (data.pillStatus.value.isRunning) {
      this.stop(data)
    } else {
      this.start(data)
    }
  }

  private start(data: ActionData) {
    if (hasScript(data)) {
      this.requestNextTick(data, true)
      data.pillStatus.next(this.buildPillStatus(data))
    } else {
      data.pillStatus.next({
        isRunning: data.pillStatus.value.isRunning,
        status: "waiting"
      })
    }
  }

  private handleTick(data: ActionDataWithScript) {
    const controller = new AbortController()
    const promise = data.script.run(controller.signal)
    data.controller = controller
    void promise.then(() => {
      data.controller = undefined
      if (data.script.periodic) {
        if (data.pillStatus.value.isRunning) {
          this.requestNextTick(data)
        }
      } else {
        this.stop(data)
      }
    }, reason => {
      if (reason instanceof Error) {
        console.error(reason)
      }

      if (data.pillStatus.value.isRunning) {
        this.stop(data)
        data.pillStatus.next({
          isRunning: data.pillStatus.value.isRunning,
          status: "auto-stopped"
        })
      }
    })
  }

  private requestNextTick(data: ActionDataWithScript, immediate: boolean = false) {
    data.timerId = setTimeout(() => {
      this.handleTick(data)
    }, immediate ? 0 : data.script.interval)
  }

  private stop(data: ActionData) {
    if (data.timerId !== undefined) {
      clearInterval(data.timerId)
      data.timerId = undefined
      if (data.controller) {
        data.controller.abort("Stopped")
      }
      data.controller = undefined
    }
    data.pillStatus.next(this.buildPillStatus(data))
  }

  private buildPillStatus(data: ActionData): PillStatus {
    if (data.timerId === undefined) {
      return {
        isRunning: false,
        status: "stopped"
      }
    } else {
      return {
        isRunning: true,
        status: data.script ? "running" : "waiting"
      }
    }
  }
}
