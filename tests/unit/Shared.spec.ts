import { describe, expect, it } from "vitest"
import { shared } from "../../src/utils/observables/Shared.ts"
import { Observable, of, Subject, tap } from "rxjs"
import { map } from "rxjs/operators"
import { collect, waitForCompletion } from "./utils.ts"

describe("Shared decorator", () => {
  it("should cache observable for same arguments", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(id: string): Observable<string> {
        callCount++
        return of(`data-${id}`)
      }
    }

    const instance = new TestClass()

    // First call should execute the method immediately
    const obs1 = instance.getData("123")
    expect(callCount).toBe(1)

    // Second call with same args should return cached observable
    const obs2 = instance.getData("123")
    expect(callCount).toBe(1) // Method not called again

    // Should be the same observable instance
    expect(obs1).toBe(obs2)
  })

  it("should create different cache entries for different arguments", () => {
    class TestClass {
      @shared
      getData(id: string): Observable<string> {
        return of(`data-${id}`)
      }
    }

    const instance = new TestClass()

    const obs1 = instance.getData("123")
    const obs2 = instance.getData("456")

    // Should be different observables
    expect(obs1).not.toBe(obs2)
  })

  it("should share observable among multiple subscribers", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(id: string): Observable<{ value: string }> {
        callCount++
        return of(1).pipe(map(() => ({ value: `data-${id}` })))
      }
    }

    const instance = new TestClass()
    const obs = instance.getData("123")

    const results: { value: string }[] = []

    // Multiple subscribers
    obs.subscribe(value => results.push(value))
    obs.subscribe(value => results.push(value))
    obs.subscribe(value => results.push(value))

    // Method should only be called once
    expect(callCount).toBe(1)
    // All subscribers should receive the same value
    expect(new Set(results)).toHaveLength(1)
    expect(results[0].value).toEqual("data-123")
  })

  it("should clean up cache when all subscribers unsubscribe", () => {
    const subject1 = new Subject<string>()
    let callCount = 0
    let unsubscribeCount = 0

    class TestClass {
      @shared
      getData(): Observable<string> {
        callCount++
        return subject1.asObservable().pipe(tap({ unsubscribe: () => unsubscribeCount += 1 }))
      }
    }

    const instance = new TestClass()

    // First subscription
    const obs1 = instance.getData()
    const sub1 = obs1.subscribe()
    const sub2 = obs1.subscribe()

    expect(callCount).toBe(1)
    expect(unsubscribeCount).toBe(0)

    // Unsubscribe all
    sub1.unsubscribe()
    expect(unsubscribeCount).toBe(0)

    instance.getData()
    expect(callCount).toBe(1)

    sub2.unsubscribe()
    expect(unsubscribeCount).toBe(1)

    // Next call should create a new observable (cache was cleaned)
    const obs2 = instance.getData()
    obs2.subscribe()

    expect(callCount).toBe(2) // Method called again
    expect(obs1).not.toBe(obs2) // Different observable instance
  })

  it("should clean up cache when observable completes", async () => {
    let callCount = 0

    const subject1 = new Subject<string>()
    const subject2 = new Subject<string>()

    class TestClass {
      @shared
      getData(): Observable<string> {
        const call = callCount++
        if (call === 0) {
          return subject1
        } else if (call === 1) {
          return subject2
        } else {
          throw Error("Assertion error")
        }
      }
    }

    const instance = new TestClass()

    // First call
    const obs1 = instance.getData()
    const sub1 = obs1.subscribe()
    expect(callCount).toBe(1)
    subject1.complete()
    await waitForCompletion(sub1)

    // Next call should create a new observable (cache was cleaned after completion)
    const obs2 = instance.getData()
    const sub2 = obs2.subscribe()
    expect(callCount).toBe(2)
    subject2.complete()
    await waitForCompletion(sub2)
  })

  it("should maintain separate caches per instance", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(id: string): Observable<string> {
        callCount++
        return of(`data-${id}`)
      }
    }

    const instance1 = new TestClass()
    const instance2 = new TestClass()

    const obs1 = instance1.getData("123")
    const obs2 = instance2.getData("123")

    obs1.subscribe()
    obs2.subscribe()

    // Method should be called once per instance
    expect(callCount).toBe(2)
    // Should be different observables
    expect(obs1).not.toBe(obs2)
  })

  it("should handle methods with multiple arguments", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(id: string, version: number, active: boolean): Observable<string> {
        callCount++
        return of(`data-${id}-${version}-${active}`)
      }
    }

    const instance = new TestClass()

    const obs1 = instance.getData("123", 1, true)
    const obs2 = instance.getData("123", 1, true)
    const obs3 = instance.getData("123", 2, true)

    obs1.subscribe()
    obs2.subscribe()
    obs3.subscribe()

    // Same args should be cached
    expect(obs1).toBe(obs2)
    // Different args should not be cached
    expect(obs1).not.toBe(obs3)
    expect(callCount).toBe(2)
  })

  it("should handle methods with no arguments", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(): Observable<string> {
        callCount++
        return of("data")
      }
    }

    const instance = new TestClass()

    const obs1 = instance.getData()
    const obs2 = instance.getData()

    obs1.subscribe()
    obs2.subscribe()

    expect(obs1).toBe(obs2)
    expect(callCount).toBe(1)
  })

  it("should handle errors in observables", () => {
    let callCount = 0

    class TestClass {
      @shared
      getData(id: string): Observable<string> {
        callCount++
        return new Observable(subscriber => {
          subscriber.error(new Error(`Test error ${id}`))
        })
      }
    }

    const instance = new TestClass()

    const obs = instance.getData("123")

    const errors: Error[] = []
    obs.subscribe({
      error: (err: unknown) => {
        if (err instanceof Error) {
          errors.push(err)
        }
      }
    })

    expect(callCount).toBe(1)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe("Test error 123")
  })

  it("should preserve this context in decorated method", async () => {
    class TestClass {
      private readonly prefix = "prefix"

      @shared
      getData(id: string): Observable<string> {
        return of(`${this.prefix}-${id}`)
      }
    }

    const instance = new TestClass()
    const result = await collect(instance.getData("123")).all

    expect(result).toHaveLength(1)
    expect(result[0]).toBe("prefix-123")
  })
})
