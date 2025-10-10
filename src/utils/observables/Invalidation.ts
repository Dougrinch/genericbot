import { BehaviorSubject, type OperatorFunction } from "rxjs"
import { operate } from "rxjs/internal/util/lift"
import { createOperatorSubscriber } from "rxjs/internal/operators/OperatorSubscriber"
import { filter, map } from "rxjs/operators"


export function mapWithInvalidation<T, R>(
  { project, invalidationTriggerBySource, invalidationTriggerByProjected, onInvalidation }: {
    project: (value: T) => R
    invalidationTriggerBySource?: OperatorFunction<T, void>
    invalidationTriggerByProjected?: OperatorFunction<R, void>
    onInvalidation?: () => void
  }
): OperatorFunction<T, R> {
  const UNINITIALIZED: unique symbol = Symbol("UNINITIALIZED")

  function filterInitialized<T>() {
    return filter((v: T | typeof UNINITIALIZED): v is T => v !== UNINITIALIZED)
  }

  return operate((source, subscriber) => {
    const currentSource = new BehaviorSubject<T | typeof UNINITIALIZED>(UNINITIALIZED)
    const currentProjected = new BehaviorSubject<R | typeof UNINITIALIZED>(UNINITIALIZED)

    subscriber.add(() => currentSource.complete())
    subscriber.add(() => currentProjected.complete())

    subscriber.add(
      currentSource
        .pipe(
          filterInitialized(),
          map(project)
        )
        .subscribe(currentProjected)
    )

    subscriber.add(
      source.subscribe(currentSource)
    )

    function triggerInvalidate() {
      onInvalidation?.()
      currentSource.next(currentSource.value)
    }

    if (invalidationTriggerBySource) {
      subscriber.add(
        currentSource
          .pipe(
            filterInitialized(),
            invalidationTriggerBySource
          )
          .subscribe(createOperatorSubscriber(subscriber,
            () => {
              triggerInvalidate()
            }
          ))
      )
    }

    if (invalidationTriggerByProjected) {
      subscriber.add(
        currentProjected
          .pipe(
            filterInitialized(),
            invalidationTriggerByProjected
          )
          .subscribe(createOperatorSubscriber(subscriber,
            () => {
              triggerInvalidate()
            }
          ))
      )
    }

    subscriber.add(
      currentProjected
        .pipe(filterInitialized())
        .subscribe(subscriber)
    )
  })
}
