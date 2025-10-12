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
  private readonly store = new Map<AttachmentKey<unknown>, unknown>()

  has<T>(key: AttachmentKey<T>): boolean {
    return this.store.has(key)
  }

  get<T>(key: AttachmentKey<T>): T {
    return this.store.get(key) as T
  }

  set<T>(key: AttachmentKey<T>, value: T): void {
    this.store.set(key, value)
  }

  copyFrom(other: Attachments): void {
    if (other === this) {
      return
    }

    for (const key of other.store.keys()) {
      if (this.has(key)) {
        throw new Error(`Duplicated key "${key}"`)
      }
      this.set(key, other.store.get(key))
    }
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

export function mapResult<T, R>(r: Result<T>, f: (v: T) => R): Result<R> {
  if (!r.ok) {
    return r
  } else {
    return {
      ok: r.ok,
      value: f(r.value),
      attachments: r.attachments
    }
  }
}

export function flatMapResult<T, R>(r: Result<T>, f: (v: T) => Result<R>): Result<R> {
  if (!r.ok) {
    return r
  } else {
    const result = f(r.value)
    result.attachments.copyFrom(r.attachments)
    return result
  }
}

export function isResultsEqual<T>(v: (v1: T, v2: T) => boolean = Object.is): (r1: Result<T>, r2: Result<T>) => boolean {
  return (r1, r2) => {
    if (r1.ok !== r2.ok) {
      return false
    }

    if (!r1.ok && !r2.ok) {
      if (r1.error !== r2.error || r1.severity !== r2.severity) {
        return false
      }
    }

    if (r1.ok && r2.ok) {
      return v(r1.value, r2.value)
    }

    throw Error("Unreachable")
  }
}
