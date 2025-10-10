import type { ObservableInput, OperatorFunction, Subscription } from "rxjs"
import { operate } from "rxjs/internal/util/lift"
import { createOperatorSubscriber } from "rxjs/internal/operators/OperatorSubscriber"
import { innerFrom } from "rxjs/internal/observable/innerFrom"


export function splitMerge<T, P, R>(
  split: (value: T) => Set<P>,
  project: (part: P) => ObservableInput<R>
): OperatorFunction<T, R> {
  return operate((source, subscriber) => {
    let isComplete = false
    let activeCount = 0
    const current = new Map<P, Subscription>()

    const checkComplete = () => {
      if (isComplete && activeCount === 0) {
        subscriber.complete()
      }
    }

    source.subscribe(createOperatorSubscriber(subscriber,
      value => {
        const parts = split(value)

        const toAdd = Array.from(parts.values()).filter(v => !current.has(v))
        const toRemove = Array.from(current.keys()).filter(p => !parts.has(p))

        for (const part of toRemove) {
          current.get(part)!.unsubscribe()
          current.delete(part)
          activeCount -= 1
          checkComplete()
        }

        for (const part of toAdd) {
          activeCount += 1

          const subscription = innerFrom(project(part)).subscribe(createOperatorSubscriber(subscriber,
            innerValue => {
              subscriber.next(innerValue)
            }, () => {
              current.delete(part)
              activeCount -= 1
              checkComplete()
            }))

          current.set(part, subscription)
        }
      },
      () => {
        isComplete = true
        checkComplete()
      }
    ))
  })
}
