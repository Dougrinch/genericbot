/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return */
import { vi } from "vitest"

export type WaitForOpts = Parameters<typeof vi.waitFor>[1]

export async function safeWaitFor<T>(
  callback: () => T | Promise<T>,
  opts: WaitForOpts = { timeout: 1000, interval: 0 }
): Promise<Awaited<T>> {
  return await vi.waitFor(callback, opts)
}

export type Promisify<O> = {
  [K in keyof O]: O[K] extends (...args: infer A) => infer R
    ? K extends "map"
      ? (...args: A) => Promisify<R>
      : O extends R
        ? Promisify<O[K]>
        : (...args: A) => Promise<R>
    : O[K];
}

export function waitForPromisify<T>(callback: () => T | Promise<T>): Promisify<Awaited<T>> {
  return promisify(safeWaitFor(callback))
}

export function promisify<T>(promise: Promise<T>): Promisify<T> {
  type Step = {
    key: any
    args?: any[]
  }

  function build(chain: Step[] = []) {
    return new Proxy(function () {} as any as Promisify<T>, {
      get(_target, prop) {
        if (prop === "then" || prop === Symbol.toStringTag) {
          throw Error(`Unsupported property: ${String(prop)}`)
        }
        return build([...chain, { key: prop }])
      },

      apply(_target, _thisArg, args): any {
        if (chain[chain.length - 1].key === "map") {
          return build([...chain.slice(0, -1), { key: "map", args: args }])
        }

        return promise.then(initial => {
          function call(thisArgument: any, key: any, args: any[]) {
            const func = thisArgument[key] as (...args: any[]) => any
            if (typeof func !== "function") {
              throw new TypeError(`Tried to call non-function property "${String(key)}"`)
            }
            return Reflect.apply(func, thisArgument, args)
          }

          let object = initial as any

          for (let i = 0; i < chain.length - 1; i++) {
            const { key, args } = chain[i]
            if (key === "map") {
              object = call(object, key, args!)
            } else {
              object = object[key]
            }
          }

          const key = chain[chain.length - 1].key
          return call(object, key, args)
        })
      }
    })
  }

  return build()
}
