/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Draft, produce } from "immer";

export type Updaters<S> = Record<string, (state: Draft<S>, payload?: any) => void>

export type ActionsFromUpdaters<S, U extends Updaters<S>> = {
  [K in keyof U]:
  Parameters<U[K]> extends [S]
    ? { type: K }
    : ({ type: K } & Parameters<U[K]>[1])
}[keyof U];

type Reducer<S, U extends Updaters<S>> = (state: S, action: ActionsFromUpdaters<S, U>) => S;

function createMutableStateReducerInternal<S, U extends Updaters<S>>(api: U): Reducer<S, U> {
  return ((state, action) => {
    const fn = api[action.type];

    return produce(state, draft => {
      if (fn.length === 1) {
        fn(draft);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...payload } = action;
        fn(draft, payload);
      }
    })
  });
}


type AnyUpdaters = Record<string, (state: Draft<any>, payload?: any) => void>;
type StateArg<F> = F extends (state: infer S, payload?: any) => void ? S : never;
type StatesOf<U extends AnyUpdaters> = StateArg<U[keyof U]>;

type IsUnion<T, U = T> =
  (T extends any ? (U extends T ? 1 : 2) : never) extends 1 ? false : true;

type StateFromUpdaters<U extends AnyUpdaters> =
  IsUnion<StatesOf<U>> extends true ? never : StatesOf<U>;

export type Actions<U extends AnyUpdaters> =
  IsUnion<StatesOf<U>> extends true
    ? never
    : ActionsFromUpdaters<StateFromUpdaters<U>, U>

export function createMutableStateReducer<U extends AnyUpdaters>(
  api: U,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._why: [StateFromUpdaters<U>] extends [never]
    ? ['❌ Updaters must share the same State', StatesOf<U>]
    : []
): Reducer<StateFromUpdaters<U>, U> {
  return createMutableStateReducerInternal<StateFromUpdaters<U>, U>(api)
}
