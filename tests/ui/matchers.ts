import { type Assertion, expect } from "vitest"
import { type ProtoOf } from "./locator.ts"

export function installCustomMatchers() {
  const assertionPrototype = Object.getPrototypeOf(expect("")) as ProtoOf<Assertion>
  Object.defineProperty(assertionPrototype, "map", {
    configurable: false,
    writable: false,
    value<T, R>(this: Assertion<T>, f: (o: T) => R): Assertion<R> {
      return map(this, f)
    }
  })

  expect.extend({
    __unwrap: <T>(received: T, callback: (v: T) => void) => {
      callback(received)
      return {
        pass: true,
        message: () => `Matched ;)`
      }
    }
  })
}

declare module "vitest" {
  interface Assertion<T> {
    map<R>(f: (o: T) => R): Assertion<R>
    __unwrap(callback: (v: T) => void): void
  }
}

function map<T, R>(assertion: Assertion<T>, f: (o: T) => R): Assertion<R> {
  function build(chain: PropertyKey[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy(function () {} as any as Assertion<R>, {
      get(_target, prop) {
        return build([...chain, prop])
      },

      // When something is finally called, resolve the element and invoke the matcher
      apply(_target, _thisArg, args) {
        return assertion.__unwrap(value => {
          let assertion = expect(f(value))

          for (let i = 0; i < chain.length - 1; i++) {
            const key = chain[i] as keyof Assertion<R>
            assertion = assertion[key] as Assertion<R>
            if (typeof assertion !== "object") {
              throw new TypeError(`Tried to call non-object property "${String(key)}"`)
            }
          }

          const key = chain[chain.length - 1] as keyof Assertion<T>
          const func = assertion[key]
          if (typeof func !== "function") {
            throw new TypeError(`Tried to call non-function property "${String(key)}"`)
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return Reflect.apply(func, assertion, args)
        })
      }
    })
  }

  return build()
}
