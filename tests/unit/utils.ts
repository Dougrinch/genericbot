import { firstValueFrom, type Observable, Subject, type Subscription } from "rxjs"

export async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitForCompletion(subscription: Subscription) {
  await new Promise<void>(resolve => subscription.add(resolve))
}

type Collector<T> = {
  last: T
  next: Promise<T>
  all: Promise<T[]>
  allRemaining: Promise<T[]>
  stop: () => void
}

export function collect<T>(observable: Observable<T>): Collector<T> {
  const collectedValues: T[] = []
  const nextValue = new Subject<T>()
  const subscription = observable.subscribe(item => {
    collectedValues.push(item)
    nextValue.next(item)
  })
  let lastReturnedIndex = -1
  return {
    get last() {
      return collectedValues[collectedValues.length - 1]
    },
    get next(): Promise<T> {
      if (lastReturnedIndex + 1 < collectedValues.length) {
        lastReturnedIndex += 1
        return Promise.resolve(collectedValues[lastReturnedIndex])
      }
      return firstValueFrom(nextValue)
        .then(v => {
          lastReturnedIndex += 1
          return v
        })
    },
    get all(): Promise<T[]> {
      return waitForCompletion(subscription)
        .then(() => collectedValues)
    },
    get allRemaining(): Promise<T[]> {
      const currentSize = collectedValues.length
      return waitForCompletion(subscription)
        .then(() => collectedValues.slice(currentSize))
    },
    stop() {
      subscription.unsubscribe()
    }
  }
}
