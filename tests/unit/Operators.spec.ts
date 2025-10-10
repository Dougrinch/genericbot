import { describe, expect, it } from "vitest"
import { BehaviorSubject, interval, Observable, Subject } from "rxjs"
import { splitMerge } from "../../src/utils/observables/SplitMerge.ts"
import { mapWithInvalidation } from "../../src/utils/observables/Invalidation.ts"
import { map, switchMap } from "rxjs/operators"
import { collect, wait } from "./utils.ts"

describe("Operators", () => {
  it("everything stopped when unsubscribed", () => {
    const src = new BehaviorSubject("initial")

    const projected: string[] = []

    src.pipe(
      mapWithInvalidation({
        project: v => {
          projected.push(v)
          return v
        },
        invalidationTriggerBySource: switchMap(() => interval(200).pipe(map(() => {})))
      })
    )
      .subscribe(() => { })
      .unsubscribe()

    src.next("afterUnsubscribe1")
    src.next("afterUnsubscribe2")
    src.next("afterUnsubscribe3")

    expect(projected).toStrictEqual(["initial"])
  })

  it("everything stopped when source completed", () => {
    const src = new BehaviorSubject("initial")

    const projected: string[] = []

    src.pipe(
      mapWithInvalidation({
        project: v => {
          projected.push(v)
          return v
        },
        invalidationTriggerBySource: switchMap(() => interval(200).pipe(map(() => {})))
      })
    )
      .subscribe(() => { })

    src.complete()

    src.next("afterUnsubscribe1")
    src.next("afterUnsubscribe2")
    src.next("afterUnsubscribe3")

    expect(projected).toStrictEqual(["initial"])
  })

  it("invalidation", async () => {
    const source = new Subject<string>()

    const invalidateSource = new Subject<void>()
    const invalidateProjected = new Subject<void>()

    let i = 0
    const observable = source
      .pipe(
        mapWithInvalidation({
          project: v => `${v} ${i++}`,
          invalidationTriggerBySource: switchMap(() => invalidateSource),
          invalidationTriggerByProjected: switchMap(() => invalidateProjected)
        })
      )
    const values = collect(observable)

    invalidateSource.next()
    invalidateProjected.next()
    source.next("a") //a 0
    invalidateSource.next() //a 1
    invalidateProjected.next() //a 2
    source.next("b") //b 3
    invalidateSource.next() //b 4
    invalidateProjected.next() //b 5
    invalidateSource.complete()
    source.next("c") //c 6
    invalidateSource.next()
    invalidateProjected.next() //c 7
    invalidateProjected.complete()
    source.next("d") //d 8
    invalidateSource.next()
    invalidateProjected.next()
    source.complete()

    expect(await values.all).toStrictEqual([
      "a 0", "a 1", "a 2", "b 3", "b 4", "b 5", "c 6", "c 7", "d 8"
    ])
  })

  it("splitMerge", async () => {
    const subject = new Subject<number[]>()

    let innerCreated = 0
    let innerClosed = 0

    let startTime = 0

    function inner(v: number): Observable<[number, string]> {
      innerCreated++
      return new Observable(subscriber => {
        const interval = 100
        let i = 0
        const next = () => {
          const timeStamp = Math.floor(performance.now()) - startTime
          subscriber.next([timeStamp, `${v}: ${i}`])
          i += 1
          if (i < v) {
            setTimeout(next, interval)
          } else {
            subscriber.complete()
          }
        }
        setTimeout(next, interval)
        return () => {
          innerClosed++
          subscriber.unsubscribe()
        }
      })
    }


    const observable = subject
      .pipe(
        splitMerge(
          vs => new Set(vs),
          v => inner(v)
        ))

    const values = collect(observable)

    do {
      startTime = Math.floor(performance.now())
    } while (startTime % 100 !== 0)


    subject.next([1, 2, 3])
    await wait(130)
    subject.next([2, 3, 4])
    await wait(120)
    subject.next([2, 3])
    subject.complete()

    const value = await values.all
    expect(value.map(v => v[1])).toStrictEqual([
      //[1,2,3] at 0
      "1: 0", //time 100
      "2: 0", //time 100
      "3: 0", //time 100
      //[2,3,4] at 130
      "2: 1", //time 200
      "3: 1", //time 200
      "4: 0", //time 230
      //[2,3] at 250
      "3: 2", //300
      "2: 0", //350
      "2: 1" //450
    ])
    const expectedTimes = [100, 100, 100, 200, 200, 230, 300, 350, 450]
    expect(value.length === expectedTimes.length).toBeTruthy()
    for (let i = 0; i < expectedTimes.length; i++) {
      const realTime = value[i][0]
      const expectedTime = expectedTimes[i]
      const delta = 10
      expect(realTime > expectedTime - delta && realTime < expectedTime + delta).toBeTruthy()
    }

    expect(innerCreated).toBe(5)
    expect(innerClosed).toBe(5)
  })
})
