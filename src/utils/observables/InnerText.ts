import { EMPTY, type OperatorFunction } from "rxjs"
import { mapWithInvalidation } from "./Invalidation.ts"
import { switchMap } from "rxjs/operators"
import { observeMutated } from "./MutationObserver.ts"
import { rawMapResult, type Result } from "../Result.ts"


export function innerTextResult(): OperatorFunction<Result<HTMLElement>, Result<string>> {
  return innerText(
    r => rawMapResult(r, e => e.innerText),
    r => r.ok ? r.value : null
  )
}


export function innerText<T, R>(result: (v: T) => R, element: (v: T) => HTMLElement | null): OperatorFunction<T, R> {
  return mapWithInvalidation({
    project: result,
    invalidationTriggerBySource: switchMap(r => {
      const e = element(r)
      if (e) {
        return observeMutated(e, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true
        }, () => true)
      } else {
        return EMPTY
      }
    })
  })
}
