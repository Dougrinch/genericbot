import { asyncScheduler, mergeWith, Observable, pipe, shareReplay, throttleTime } from "rxjs"
import { findElementsByXPath } from "../xpath.ts"
import { isRelevantAttribute, observeMutated } from "./MutationObserver.ts"
import { share } from "rxjs/operators"
import { splitMerge } from "./SplitMerge.ts"
import { mapWithInvalidation } from "./Invalidation.ts"
import { collectAllToSet, elementsToRoot } from "../Collections.ts"
import { isResultsEqual, type Result } from "../Result.ts"
import { isArraysEqual } from "../Equals.ts"

const cache: Map<string, { subscribed: number, observable: Observable<Result<HTMLElement[]>> }> = new Map()

export function observeXPath(xpath: string): Observable<Result<HTMLElement[]>> {
  return new Observable(subscriber => {
    const existing = cache.get(xpath)
    if (existing) {
      existing.subscribed += 1
      existing.observable.subscribe(subscriber)
    } else {
      const newObservable = rawElements(xpath)
        .pipe(shareReplay({ bufferSize: 1, refCount: true }))
      newObservable.subscribe(subscriber)
      cache.set(xpath, {
        subscribed: 1,
        observable: newObservable
      })
    }
    return () => {
      const existing = cache.get(xpath)!
      existing.subscribed -= 1
      if (existing.subscribed === 0) {
        cache.delete(xpath)
      }
    }
  })
}

function rawElements(xpath: string): Observable<Result<HTMLElement[]>> {
  return new Observable<void>(subscriber => {
    subscriber.next()
  }).pipe(
    mapWithInvalidation({
      project: () => findElementsByXPath(xpath),
      isEquals: isResultsEqual(isArraysEqual()),
      invalidationTriggerByProjected: pipe(nodeRemoved(), mergeWith(nodeAddedOrAttrChanged))
    })
  )
}

const trackedAttributes = ["style", "hidden", "class"]

const nodeAddedOrAttrChanged = observeMutated(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: trackedAttributes
}, mr => isRelevantAttribute(mr, trackedAttributes) || (mr.type === "childList" && mr.addedNodes.length > 0))
  .pipe(throttleTime(100, asyncScheduler, { leading: true, trailing: true }), share())

function nodeRemoved() {
  return splitMerge<Result<HTMLElement[]>, HTMLElement, void>(
    elements => collectAllToSet(
      elements.ok ? elements.value : [],
      e => elementsToRoot(e, {
        includeSelf: true,
        includeRoot: false
      })
    ),
    element => {
      return observeMutated(element.parentElement!, {
        childList: true
      }, mr => {
        if (mr.type === "childList") {
          for (const removedNode of mr.removedNodes) {
            if (removedNode === element) {
              return true
            }
          }
        }
        return false
      })
    }
  )
}
