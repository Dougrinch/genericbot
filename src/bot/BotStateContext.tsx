import { type PropsWithChildren, useEffect } from "react"
import { dispatch } from "./BotStateHooks.tsx"

export function BotStateContext(props: PropsWithChildren) {
  useEffect(() => {
    const fixedDispatch = dispatch
    fixedDispatch({ type: "init" })
    return () => {
      fixedDispatch({ type: "stop" })
    }
    // eslint-disable-next-line
  }, [dispatch])

  return (
    <div>
      {props.children}
    </div>
  )
}
