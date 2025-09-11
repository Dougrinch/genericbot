import { type PropsWithChildren, useEffect } from "react"
import { dispatch } from "./logic/BotManager.ts"

export function BotStateContext(props: PropsWithChildren) {
  useEffect(() => {
    const fixedDispatch = dispatch
    fixedDispatch.init()
    return () => {
      fixedDispatch.close()
    }
    // eslint-disable-next-line
  }, [dispatch])

  return (
    <div>
      {props.children}
    </div>
  )
}
