import { type BotManager } from "./BotManager.ts"
import type { ActionConfig } from "./Config.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { mapResult, type Result, switchMapResult } from "../../utils/Result.ts"
import { BehaviorSubject, type Observable, of, type Subscription, tap } from "rxjs"
import { splitMerge } from "../../utils/observables/SplitMerge.ts"
import { ObservableMap } from "../../utils/observables/ObservableMap.ts"
import { switchMap } from "rxjs/operators"
import { elements } from "./ElementsObserver.ts"
import { shared } from "../../utils/observables/Shared.ts"


export function usePillStatus(id: string): PillStatus | undefined {
  return useBotObservable(m => m.actions.pillStatus(id), [id])
}

export function useActionValue(id: string): Result<unknown> {
  return useBotObservable(m => m.actions.value(id), [id])
}


type ActionData = {
  pillStatus: BehaviorSubject<PillStatus>

  action?: Action
  timerId?: number
  controller?: AbortController
}

export type Action = {
  run(signal: AbortSignal): Promise<void>
  periodic: boolean
  interval: number
}

type ReadyActionData = ActionData & Required<Pick<ActionData, "action">>

function isReady(data: ActionData): data is ReadyActionData {
  return data.action !== undefined
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

  private onScriptUpdate(id: string, r: Result<Action>) {
    this.onScriptRemove(id)

    const data: ActionData = {
      pillStatus: new BehaviorSubject<PillStatus>({
        isRunning: false,
        status: "stopped"
      }),
      action: r.ok ? r.value : undefined
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

  @shared
  value(id: string): Observable<Result<Action>> {
    return this.bot.config.action(id)
      .pipe(
        switchMapResult(action => this.actionValue(action))
      )
  }

  private actionValue(action: ActionConfig): Observable<Result<Action>> {
    if (action.type === "xpath") {
      return elements(action.xpath, true, action.allowMultiple)
        .pipe(mapResult(e => elementsAction(action, e)))
    } else if (action.type === "element") {
      return this.bot.elements.value(action.element)
        .pipe(mapResult(e => elementsAction(action, e)))
    } else if (action.type === "script") {
      return this.bot.scriptActionFactory
        .runnableScript(action)
    } else {
      throw new Error("Unreachable")
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
    if (isReady(data)) {
      this.requestNextTick(data, true)
      data.pillStatus.next(this.buildPillStatus(data))
    } else {
      data.pillStatus.next({
        isRunning: data.pillStatus.value.isRunning,
        status: "waiting"
      })
    }
  }

  private handleTick(data: ReadyActionData) {
    const controller = new AbortController()
    const promise = data.action.run(controller.signal)
    data.controller = controller
    void promise.then(() => {
      data.controller = undefined
      if (data.action.periodic) {
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

  private requestNextTick(data: ReadyActionData, immediate: boolean = false) {
    data.timerId = setTimeout(() => {
      this.handleTick(data)
    }, immediate ? 0 : data.action.interval)
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
        status: data.action ? "running" : "waiting"
      }
    }
  }
}

function elementsAction(action: ActionConfig, elements: HTMLElement[]): Action {
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
