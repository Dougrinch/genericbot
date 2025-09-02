/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Draft, produce } from "immer"

type Is<A, B> = A extends B ? true : false
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type And<A, B> = A extends true ? (B extends true ? true : false) : false
type Or<A, B> = A extends true ? true : (B extends true ? true : false)

type IsUpdater<F, S> = F extends (...args: infer A) => infer R
  ? And<Or<Is<A, [S]>, Is<A, [S, object]>>, Eq<R, void>>
  : never

type Updater<S> = (state: Draft<S>, action?: any) => S
type UpdaterParameters<F> = F extends (...args: infer A) => any
  ? A
  : never

type ActionFromUpdaters<S, U> = {
  [K in keyof U]:
  IsUpdater<U[K], S> extends true
    ? (UpdaterParameters<U[K]> extends [S]
      ? { type: K }
      : ({ type: K } & UpdaterParameters<U[K]>[1]))
    : never
}[keyof U]

type Reducer<S, U> = (state: S, action: ActionFromUpdaters<S, U>) => S

function createMutableStateReducerInternal<S, U>(api: U): Reducer<S, U> {
  return (state, action) => {
    const fn = api[action.type] as Updater<S>

    return produce(state, draft => {
      if (fn.length === 1) {
        fn(draft)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...payload } = action
        fn(draft, payload)
      }
    })
  }
}

type AnyUpdaters = Record<string, (state: Draft<any>, payload?: any) => void>
type StateArg<F> = F extends any
  ? IsUpdater<F, any> extends true
    ? F extends (state: infer S, payload?: any) => void
      ? S
      : never
    : never
  : never
type StatesOf<U> = StateArg<U[keyof U]>

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never
type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true

type StateFromUpdaters<U> = IsUnion<StatesOf<U>> extends true ? never : StatesOf<U>

export type Action<U extends AnyUpdaters> = IsUnion<StatesOf<U>> extends true
  ? never
  : ActionFromUpdaters<StateFromUpdaters<U>, U>

export function createMutableStateReducer<U>(api: U): Reducer<StateFromUpdaters<U>, U> {
  return createMutableStateReducerInternal(api)
}
