import { type Observable } from "rxjs"
import { finalize, shareReplay } from "rxjs/operators"

interface CacheHolder {
  [key: symbol]: Map<string, Observable<unknown>>
}

export function shared<TArgs extends unknown[], TReturn>(
  originalMethod: (...args: TArgs) => Observable<TReturn>,
  context: ClassMethodDecoratorContext
): (...args: TArgs) => Observable<TReturn> {
  const cacheSymbol = Symbol(`memo_cache_${String(context.name)}`)

  return function (this: CacheHolder, ...args: TArgs): Observable<TReturn> {
    if (this[cacheSymbol] === undefined) {
      this[cacheSymbol] = new Map<string, Observable<unknown>>()
    }

    const cache = this[cacheSymbol]

    const cacheKey = JSON.stringify(args)

    let cached = cache.get(cacheKey) as Observable<TReturn> | undefined

    if (cached === undefined) {
      cached = originalMethod.apply(this, args)
        .pipe(
          finalize(() => {
            cache.delete(cacheKey)
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        )

      cache.set(cacheKey, cached)
    }

    return cached
  }
}
