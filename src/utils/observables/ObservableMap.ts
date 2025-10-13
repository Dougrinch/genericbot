import { BehaviorSubject, type Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"

export class ObservableMap<K, V> {
  private readonly state: BehaviorSubject<ReadonlyMap<K, V>> = new BehaviorSubject<ReadonlyMap<K, V>>(new Map())

  get(key: K): V | undefined {
    return this.state.value.get(key)
  }

  set(key: K, value: V) {
    const nextState = new Map(this.state.value)
    nextState.set(key, value)
    this.state.next(nextState)
  }

  delete(key: K) {
    if (!this.state.value.has(key)) {
      return
    }
    const nextState = new Map(this.state.value)
    nextState.delete(key)
    this.state.next(nextState)
  }

  observe(key: K): Observable<V | undefined> {
    return this.state.pipe(
      map(map => map.get(key)),
      distinctUntilChanged()
    )
  }
}
