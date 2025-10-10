export type Try<T> = {
  ok: true
  value: T
} | {
  ok: false
  error: string
  severity: Severity
}

export type Severity = "warn" | "err"

export function mapTry<T, R>(f: (value: T) => R): (t: Try<T>) => Try<R> {
  return t => {
    if (t.ok) {
      return {
        ok: true,
        value: f(t.value)
      }
    } else {
      return t
    }
  }
}
