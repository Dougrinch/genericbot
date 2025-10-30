import { observeAttributeChange } from "../../utils/observables/MutationObserver.ts"
import { type Observable, type OperatorFunction } from "rxjs"
import { observeXPath } from "../../utils/observables/XPathObserver.ts"
import { mapWithInvalidation } from "../../utils/observables/Invalidation.ts"
import { splitMerge } from "../../utils/observables/SplitMerge.ts"
import { collectAllToSet, elementsToRoot } from "../../utils/Collections.ts"
import {
  error,
  flatMapResult,
  isResultsEqual,
  mapAttachInner,
  mapResult,
  newAttachmentKey,
  ok,
  rawMapResult,
  type Result
} from "../../utils/Result.ts"
import { isArraysEqual } from "../../utils/Equals.ts"
import { distinctUntilChanged } from "rxjs/operators"


export const ElementsInfoKey = newAttachmentKey<ElementInfo[]>("elementsInfo")

export type ElementInfo = {
  element: HTMLElement
  isVisible: boolean
}


export function element(xpath: string, includeInvisible: boolean): Observable<Result<HTMLElement>> {
  return elements(xpath, includeInvisible, false).pipe(singleElement())
}

export function singleElement(): OperatorFunction<Result<HTMLElement[]>, Result<HTMLElement>> {
  return flatMapResult((elements, r) => {
    if (elements.length === 1) {
      return ok(elements[0])
    }

    if (elements.length === 0) {
      if (r.attachments.get(ElementsInfoKey).length > 0) {
        return error("Element hidden", "warn")
      } else {
        return error("XPath matched 0 elements.", "warn")
      }
    } else {
      return error(`XPath matched ${r.attachments.get(ElementsInfoKey).length} elements (need exactly 1).`, "warn")
    }
  })
}

export function elements(xpath: string, includeInvisible: boolean, allowMultiple: boolean = true): Observable<Result<HTMLElement[]>> {
  return allElements(xpath)
    .pipe(
      mapResult(elements => {
        return (includeInvisible ? elements : elements.filter(i => i.isVisible))
          .map(i => i.element)
      }),
      distinctUntilChanged(isResultsEqual(isArraysEqual((e1, e2) => e1 === e2))),
      flatMapResult((elements, r) => {
        if (!allowMultiple && elements.length > 1) {
          return error(`XPath matched ${r.attachments.get(ElementsInfoKey).length} elements (need exactly 1).`, "warn")
        } else {
          return r
        }
      })
    )
}

function allElements(xpath: string): Observable<Result<ElementInfo[]>> {
  return observeXPath(xpath)
    .pipe(
      mapWithInvalidation({
        project: r => rawMapResult(r, es => es.map(e => ({
          element: e,
          isVisible: e.checkVisibility()
        }))),
        isEquals: isResultsEqual(isArraysEqual<ElementInfo>((e1, e2) => {
          return e1.element === e2.element && e1.isVisible === e2.isVisible
        })),
        invalidationTriggerByProjected: splitMerge(
          (v: Result<ElementInfo[]>) => collectAllToSet(
            v.ok ? v.value.map(i => i.element) : [],
            e => elementsToRoot(e, {
              includeSelf: true,
              includeRoot: true
            })
          ),
          element => observeAttributeChange(element, ["style", "hidden", "class"])
        )
      }),
      mapAttachInner(ElementsInfoKey, e => e)
    )
}
