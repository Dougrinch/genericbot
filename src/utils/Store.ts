import { type Dispatch, type Reducer, useRef, useSyncExternalStore } from "react"

export type Store<S, A> = {
  readonly dispatch: Dispatch<A>
  useStoreState<T>(selector?: (state: S) => T): T
}

export function createStore<S, A>(reducer: Reducer<S, A>, initial: () => S): Store<S, A> {
  let state: S = initial()

  const listeners = new Set<() => void>([])

  function subscribe(onChange: () => void): () => void {
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }

  return {
    dispatch: event => {
      state = reducer(state, event)
      listeners.forEach(onChange => onChange())
    },

    useStoreState: function <T>(selector?: (state: S) => T): T {
      const lastValueRef = useRef<T | null>(null)

      return useSyncExternalStore(subscribe, () => {
        const result = (selector ? selector(state) : state) as T
        if (Array.isArray(result)) {
          if (lastValueRef.current !== null
            && result.length === (lastValueRef.current as []).length
            && result.every((v, i) => v === (lastValueRef.current as [])[i])
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
