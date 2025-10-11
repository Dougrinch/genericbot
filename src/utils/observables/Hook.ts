import { BehaviorSubject, type Observable, type Subscription } from "rxjs"
import { useCallback, useRef, useSyncExternalStore } from "react"

const UNSET: unique symbol = Symbol("UNSET")

type Entry<T> = {
  subject: BehaviorSubject<T | typeof UNSET>
  observable: Observable<T>
  subscription?: Subscription
  active: number
}

function trySubscribeToRoot<T>(entry: Entry<T>) {
  if (entry.subscription === undefined) {
    entry.subscription = entry.observable.subscribe(entry.subject)
  }
}

function tryUnsubscribeFromRoot<T>(entry: Entry<T>) {
  if (entry.active === 0) {
    forceUnsubscribeFromRoot(entry)
  }
}

function forceUnsubscribeFromRoot<T>(entry: Entry<T>) {
  entry.subscription!.unsubscribe()
  entry.subscription = undefined
}


export function useObservable<T>(observable: Observable<T>): T | undefined {
  const entryRef = useRef<Entry<T>>(null)
  if (entryRef.current == null) {
    entryRef.current = {
      subject: new BehaviorSubject<T | typeof UNSET>(UNSET),
      observable: observable,
      active: 0
    }
  }

  const entry = entryRef.current
  if (observable !== entry.observable) {
    forceUnsubscribeFromRoot(entry)
    entry.observable = observable
  }
  trySubscribeToRoot(entry)

  if (entry.active === 0) {
    setTimeout(() => {
      tryUnsubscribeFromRoot(entry)
    }, 100)
  }

  const subscribe = useCallback((onChange: () => void) => {
    trySubscribeToRoot(entry)
    entry.active += 1
    const subscription = entry.subject.subscribe({
      next: onChange
    })
    return () => {
      subscription.unsubscribe()
      entry.active -= 1
      tryUnsubscribeFromRoot(entry)
    }
  }, [entry])

  const getSnapshot = useCallback(() => entry.subject.value, [entry])

  const result = useSyncExternalStore(subscribe, getSnapshot)
  if (result === UNSET) {
    throw Error("Observable must return a value immediately")
  }
  return result
}
