import { vi } from "vitest"

export type Promisify<O> = {
  [K in keyof O]: O[K] extends (...args: infer A) => infer R
    ? O extends R
      ? Promisify<O[K]>
      : (...args: A) => Promise<R>
    : O[K];
}

export function waitForPromisify<T>(
  callback: () => T | Promise<T>,
  opts: Parameters<typeof vi.waitFor>[1] = { timeout: 1000, interval: 0 }
): Promisify<Awaited<T>> {
  return promisify(vi.waitFor(callback, opts))
}

export function promisify<T>(promise: Promise<T>): Promisify<Awaited<T>> {
  function build(chain: PropertyKey[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy(function () {} as any as Promisify<Awaited<T>>, {
      // Allow `.not`, `.deep`, etc. by extending the chain
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toStringTag) {
          throw Error(`Unsupported property: ${String(prop)}`)
        }
        return build([...chain, prop])
      },

      // When something is finally called, resolve the element and invoke the matcher
      async apply(_target, _thisArg, args) {
        let assertion = await promise

        for (let i = 0; i < chain.length - 1; i++) {
          const key = chain[i] as keyof Awaited<T>
          assertion = assertion[key] as Awaited<T>
          if (typeof assertion !== "object") {
            throw new TypeError(`Tried to call non-object property "${String(key)}"`)
          }
        }

        const key = chain[chain.length - 1] as keyof Awaited<T>
        const func = assertion[key]
        if (typeof func !== "function") {
          throw new TypeError(`Tried to call non-function property "${String(key)}"`)
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return Reflect.apply(func, assertion, args)
      }
    })
  }

  return build()
}
