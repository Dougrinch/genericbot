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
      return useSyncExternalStore(subscribe, useGetSnapshot(() => select(selector)))
    }
  }
}

export function useGetSnapshot<T>(getValue: () => T): () => T {
  const lastValueRef = useRef<T | null>(null)
  return () => {
    const oldValue = lastValueRef.current
    const newValue = getValue()

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      if (newValue.length === oldValue.length
        && newValue.every((v, i) => Object.is(v, oldValue[i]))
      ) {
        return oldValue
      }
    }

    if (isRecord(newValue) && isRecord(oldValue)) {
      const newKeys = Object.keys(newValue)
      const oldKeys = Object.keys(oldValue)
      if (newKeys.length === oldKeys.length
        && newKeys.every(key => Object.is(newValue[key], oldValue[key]))
      ) {
        return oldValue
      }
    }

    lastValueRef.current = newValue
    return newValue
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x)
}
