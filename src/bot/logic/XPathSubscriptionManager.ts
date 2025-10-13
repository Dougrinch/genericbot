import { observeAttributeChange } from "../../utils/observables/MutationObserver.ts"
import { type Observable, type OperatorFunction } from "rxjs"
import { observeXPath } from "../../utils/observables/XPathObserver.ts"
import { mapWithInvalidation } from "../../utils/observables/Invalidation.ts"
import { splitMerge } from "../../utils/observables/SplitMerge.ts"
import { collectAllToSet, elementsToRoot } from "../../utils/Collections.ts"
import { innerText } from "../../utils/observables/InnerText.ts"
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


export const ElementsInfoKey = newAttachmentKey<ElementInfo[]>("elementsInfo")

export type ElementInfo = {
  element: HTMLElement
  isVisible: boolean
}

export class XPathSubscriptionManager {
  innerText(xpath: string, includeInvisible: boolean): Observable<Result<string>> {
    return this.element(xpath, includeInvisible)
      .pipe(
        innerTextResult()
      )
  }

  element(xpath: string, includeInvisible: boolean): Observable<Result<HTMLElement>> {
    return this.elements(xpath, includeInvisible, false)
      .pipe(
        flatMapResult((elements, r) => {
          if (elements.length === 0) {
            if (r.attachments.get(ElementsInfoKey).length > 0) {
              return error("Element hidden", "warn")
            } else {
              return error("XPath matched 0 elements.", "warn")
            }
          } else {
            return ok(elements[0])
          }
        })
      )
  }

  elements(xpath: string, includeInvisible: boolean, allowMultiple: boolean = true): Observable<Result<HTMLElement[]>> {
    return this.allElements(xpath)
      .pipe(
        mapResult(elements => {
          return (includeInvisible ? elements : elements.filter(i => i.isVisible))
            .map(i => i.element)
        }),
        flatMapResult((elements, r) => {
          if (!allowMultiple && elements.length > 1) {
            return error(`XPath matched ${r.attachments.get(ElementsInfoKey).length} elements (need exactly 1).`, "warn")
          } else {
            return r
          }
        })
      )
  }

  private allElements(xpath: string): Observable<Result<ElementInfo[]>> {
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
}

export function innerTextResult(): OperatorFunction<Result<HTMLElement>, Result<string>> {
  return innerText(
    r => rawMapResult(r, e => e.innerText),
    r => r.ok ? r.value : null
  )
}
