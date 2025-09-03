import type { Locator } from "@vitest/browser/context"
import { type Assertion, expect, vi } from "vitest"


type Promisify<O> = {
  [K in keyof O]: O[K] extends (...args: infer A) => infer R
    ? O extends R
      ? Promisify<O[K]>
      : (...args: A) => Promise<R>
    : O[K];
}

export function element(locator: Locator, opts: Parameters<typeof vi.waitFor>[1] = { interval: 0 }): Promisify<Assertion<Element>> {
  return expectSafe(() => locator.element(), opts)
}

export function elements(locator: Locator): Promisify<Assertion<Element[]>> {
  return expectSafe(() => locator.elements(), { interval: 0 })
}

function expectSafe<T>(callback: () => T | Promise<T>, opts?: Parameters<typeof vi.waitFor>[1]): Promisify<Assertion<T>> {
  const basePromise = vi.waitFor(callback, opts)

  function build(chain: PropertyKey[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy(function () {} as any as Promisify<Assertion<T>>, {
      // Allow `.not`, `.deep`, etc. by extending the chain
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toStringTag) {
          throw Error(`Unsupported property: ${String(prop)}`)
        }
        return build([...chain, prop])
      },

      // When something is finally called, resolve the element and invoke the matcher
      async apply(_target, _thisArg, args) {
        const element = await basePromise as T

        let assertion = expect(element)

        for (let i = 0; i < chain.length - 1; i++) {
          const key = chain[i] as keyof Assertion<T>
          assertion = assertion[key] as Assertion<T>
          if (typeof assertion !== "object") {
            throw new TypeError(`Tried to call non-object property "${String(key)}"`)
          }
        }

        const key = chain[chain.length - 1] as keyof Assertion<T>
        const func = assertion[key]
        if (typeof func !== "function") {
          throw new TypeError(`Tried to call non-function property "${String(key)}"`)
        }

        return Reflect.apply(func, assertion, args)
      }
    })
  }

  return build()
}
