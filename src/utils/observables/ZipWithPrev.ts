import { type OperatorFunction } from "rxjs"
import { operate } from "rxjs/internal/util/lift"
import { createOperatorSubscriber } from "rxjs/internal/operators/OperatorSubscriber"

export function zipWithPrev<T>(): OperatorFunction<T, { prev: T | null, current: T }> {
  return operate((source, subscriber) => {
    let prev: T | null = null
    source.subscribe(
      createOperatorSubscriber(subscriber, value => {
        const p = prev
        prev = value
        subscriber.next({ prev: p, current: value })
      })
    )
  })
}
