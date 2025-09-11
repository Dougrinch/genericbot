import { type Dispatch, type Reducer, useRef, useSyncExternalStore } from "react"

export type Store<S, D> = {
  readonly dispatch: D
  useStoreState: <T>(selector: (state: S) => T) => T
}

export function createReducerStore<S, A>(reducer: Reducer<S, A>, initial: () => S): Store<S, Dispatch<A>> {
  let state = initial()
  return createStore(
    (action: A) => {
      state = reducer(state, action)
    },
    <T>(selector: (state: S) => T): T => {
      return selector(state)
    }
  )
}

export function createStore<S, A>(
  handle: (action: A) => void,
  select: <T>(selector: (state: S) => T) => T
): Store<S, Dispatch<A>> {
  const listeners = new Set<() => void>([])

  function subscribe(onChange: () => void): () => void {
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }

  return {
    dispatch: event => {
      handle(event)
      listeners.forEach(onChange => onChange())
    },

    useStoreState: function <T>(selector: (state: S) => T): T {
      const lastValueRef = useRef<T | null>(null)

      return useSyncExternalStore(subscribe, () => {
        const result = select(selector)
        if (Array.isArray(result)) {
          if (lastValueRef.current !== null
            && result.length === (lastValueRef.current as []).length
            && result.every((v, i) => Object.is(v, (lastValueRef.current as [])[i]))
          ) {
            return lastValueRef.current
          } else {
            lastValueRef.current = result
            return result
          }
        } else {
          return result
        }
      })
    }
  }
}
