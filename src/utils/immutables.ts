import { type Immutable } from "immer"

type MutableFlag = { __mutable: true }

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MarkMutable<T> = T extends number | string | boolean | MutableFlag | Function
  ? T
  : T extends Array<infer E>
    ? Array<MarkMutable<E>>
    : T extends Map<infer K, infer V>
      ? Map<K, MarkMutable<V>>
      : T extends object
        ? ({
          [K in keyof T]: MarkMutable<T[K]>;
        } & MutableFlag)
        : never

export type MarkImmutable<T> = T extends number | string | boolean
  ? T
  : T extends Array<infer E>
    ? Array<MarkImmutable<E>>
    : T extends Map<infer K, infer V>
      ? Map<K, MarkImmutable<V>>
      : T extends object
        ? Immutable<Omit<{
          [K in keyof T]: MarkImmutable<T[K]>;
        }, keyof MutableFlag>>
        : never

export function markMutable<T>(t: T): MarkMutable<T> {
  return t as MarkMutable<T>
}

export function markImmutable<T>(t: T): MarkImmutable<T> {
  return t as MarkImmutable<T>
}
