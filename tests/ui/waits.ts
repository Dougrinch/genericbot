/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return */
import { vi } from "vitest"

export type WaitForOpts = Parameters<typeof vi.waitFor>[1]

export async function safeWaitFor<T>(
  callback: () => T | Promise<T>,
  opts: WaitForOpts = { timeout: 1000, interval: 0 }
): Promise<T> {
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

export type Step = {
  key: any
  args?: any[]
}

export function waitForPromisify<T>(callback: (chain: Step[]) => T | Promise<T>): Promisify<T> {
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

        return safeWaitFor(async () => {
          const initial = callback(chain)

          let object = (initial instanceof Promise ? await initial : initial) as any

          for (let i = 0; i < chain.length - 1; i++) {
            const { key: key_1, args: args_3 } = chain[i]
            if (key_1 === "map") {
              object = call(object, key_1, args_3!)
            } else {
              object = object[key_1]
            }
          }
          const key_2 = chain[chain.length - 1].key
          return call(object, key_2, args)
        })
      }
    })
  }

  return build()
}

function call(thisArgument: any, key: any, args: any[]) {
  const func = thisArgument[key] as (...args: any[]) => any
  if (typeof func !== "function") {
    throw new TypeError(`Tried to call non-function property "${String(key)}"`)
  }
  return Reflect.apply(func, thisArgument, args)
}
