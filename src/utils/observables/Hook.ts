import { type Observable } from "rxjs"
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react"

export function useObservable<T>(factory: () => Observable<T>): T | undefined {
  const observable = useMemo(factory, [factory])

  const lastValue = useRef<T | undefined>(undefined)

  const subscribe = useCallback((onChange: () => void) => {
    const subscription = observable.subscribe(value => {
      lastValue.current = value
      onChange()
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [observable])

  const getSnapshot = useCallback(() => lastValue.current, [lastValue])

  return useSyncExternalStore(subscribe, getSnapshot)
}
