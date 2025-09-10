/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Dispatch as ReactDispatch } from "react"

import { createStore, type Store } from "./Store.ts"

type Atomic = ((...args: any) => any) | any[] | Map<any, any>

type IsSimpleObject<T> = T extends Atomic
  ? false
  : T extends object
    ? true
    : false

export type Dispatch<T> = T extends (...args: any) => infer R
  ? R extends void
    ? T
    : never
  : IsSimpleObject<T> extends true
    ? ({
      [K in keyof T as Dispatch<T[K]> extends never ? never : K]: Dispatch<T[K]>
    }) extends infer O
      ? object extends O
        ? never
        : O
      : never
    : never

type DispatchEvent = { type: string, args: any[] }

function createDispatch<T>(dispatcher: (event: DispatchEvent) => void): Dispatch<T> {
  function build(steps: string[]) {
    return new Proxy(function () {}, {
      get(_target, prop) {
        if (typeof prop !== "string") {
          throw new Error(`${String(prop)} (${typeof prop}) not supported`)
        }
        return build([...steps, prop])
      },

      apply(_target, _thisArg, argArray) {
        const type = steps.join(".")
        dispatcher({ type, args: argArray })
      }
    })
  }

  return build([]) as Dispatch<T>
}

function createManagerStoreInternal<T>(initial: () => T): Store<T, ReactDispatch<DispatchEvent>> {
  const state = initial()
  return createStore(
    (event: DispatchEvent) => {
      const steps = event.type.split(".")
      let current = state as object
      for (let i = 0; i < steps.length - 1; i++) {
        const step = steps[i] as keyof typeof current
        if (typeof current[step] !== "object") {
          throw new TypeError(`Tried to call non-object property "${String(step)}"`)
        }
        current = current[step]
      }
      const lastStep = steps[steps.length - 1] as keyof typeof current
      const func = current[lastStep]
      if (typeof func !== "function") {
        throw new TypeError(`Tried to call non-function property "${String(lastStep)}"`)
      }
      Reflect.apply(func, current, event.args)
    },
    selector => selector(state)
  )
}

export function createManagerStore<T>(initial: () => T): Store<T, Dispatch<T>> {
  const store = createManagerStoreInternal(initial)
  const dispatch = createDispatch<T>(store.dispatch)
  return {
    dispatch,
    useStoreState: selector => store.useStoreState(selector)
  }
}
