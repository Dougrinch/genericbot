import { type Observable, of, type OperatorFunction } from "rxjs"
import { map, switchMap } from "rxjs/operators"

export type Result<T> = {
  ok: true
  value: T
  attachments: Attachments
} | {
  ok: false
  error: string
  severity: Severity
  attachments: Attachments
}

export type Severity = "warn" | "err"

declare const Brand: unique symbol
export type AttachmentKey<T> = string & { [Brand]: T }

export function newAttachmentKey<T>(name: string): AttachmentKey<T> {
  return name as AttachmentKey<T>
}

export class Attachments {
  private readonly store: Map<AttachmentKey<unknown>, unknown>

  constructor(store?: Map<AttachmentKey<unknown>, unknown>) {
    this.store = store ?? new Map<AttachmentKey<unknown>, unknown>()
  }

  has<T>(key: AttachmentKey<T>): boolean {
    return this.store.has(key)
  }

  get<T>(key: AttachmentKey<T>): T {
    if (!this.has(key)) {
      return [] as T
      // throw Error(`No attachment with key "${key}"`)
    }
    return this.store.get(key) as T
  }

  attach<T>(key: AttachmentKey<T>, value: T): Attachments {
    if (this.has(key)) {
      throw new Error(`Duplicated key "${key}"`)
    }

    const newStore = new Map(this.store)
    newStore.set(key, value)
    return new Attachments(newStore)
  }

  mergeWith(other: Attachments): Attachments {
    if (this === other) {
      return this
    } else if (this.store.size === 0) {
      return other
    }

    const newStore = new Map(this.store)
    for (const key of other.store.keys()) {
      if (newStore.has(key)) {
        throw new Error(`Duplicated key "${key}"`)
      }
      newStore.set(key, other.store.get(key))
    }
    return new Attachments(newStore)
  }
}

export function ok<T>(value: T): Result<T> {
  return {
    ok: true,
    value: value,
    attachments: new Attachments()
  }
}

export function error<T>(error: string, severity: Severity): Result<T> {
  return {
    ok: false,
    error: error,
    severity: severity,
    attachments: new Attachments()
  }
}

export function mapAttachInner<T, A>(key: AttachmentKey<A>, value: (v: T) => A): OperatorFunction<Result<T>, Result<T>> {
  return map(r => rawAttachInnerTo(r, key, value))
}

export function rawAttachInnerTo<T, A>(result: Result<T>, key: AttachmentKey<A>, value: (v: T) => A): Result<T> {
  return result.ok ? rawAttachTo(result, key, value(result.value)) : result
}

export function rawAttachTo<T, A>(result: Result<T>, key: AttachmentKey<A>, value: A): Result<T> {
  return withAttachments(result, result.attachments.attach(key, value))
}

function withAttachments<T>(result: Result<T>, attachments: Attachments): Result<T> {
  if (result.attachments === attachments) {
    return result
  }

  if (result.ok) {
    return {
      ok: true,
      value: result.value,
      attachments: attachments
    }
  } else {
    return {
      ok: false,
      error: result.error,
      severity: result.severity,
      attachments: attachments
    }
  }
}


export function mapResult<T, R>(f: (v: T, r: Result<T>) => R): OperatorFunction<Result<T>, Result<R>> {
  return map(r => rawMapResult(r, f))
}

export function flatMapResult<T, R>(f: (v: T, r: Result<T>) => Result<R>): OperatorFunction<Result<T>, Result<R>> {
  return map(r => rawFlatMapResult(r, f))
}

export function switchMapResult<T, R>(project: (v: T) => Observable<Result<R>>): OperatorFunction<Result<T>, Result<R>> {
  return switchMap(source => {
    if (!source.ok) {
      return of(source)
    } else {
      return project(source.value)
        .pipe(map(result => withAttachments(result, result.attachments.mergeWith(source.attachments))))
    }
  })
}

export function rawMapResult<T, R>(r: Result<T>, f: (v: T, r: Result<T>) => R): Result<R> {
  if (!r.ok) {
    return r
  } else {
    return {
      ok: r.ok,
      value: f(r.value, r),
      attachments: r.attachments
    }
  }
}

export function rawFlatMapResult<T, R>(r: Result<T>, f: (v: T, r: Result<T>) => Result<R>): Result<R> {
  if (!r.ok) {
    return r
  } else {
    const result = f(r.value, r)
    return withAttachments(result, result.attachments.mergeWith(r.attachments))
  }
}

export function isResultsEqual<T>(v: (v1: T, v2: T) => boolean = Object.is): (r1: Result<T>, r2: Result<T>) => boolean {
  return (r1, r2) => {
    if (r1.ok !== r2.ok) {
      return false
    }

    if (!r1.ok && !r2.ok) {
      return r1.error === r2.error && r1.severity === r2.severity
    }

    if (r1.ok && r2.ok) {
      return v(r1.value, r2.value)
    }

    throw Error("Unreachable")
  }
}
