import { type PropsWithChildren, useCallback, useRef } from "react"
import { BotUIContext } from "./BotUIContext.tsx"

export function TransparentablePanel(props: PropsWithChildren) {
  const divRef = useRef<HTMLDivElement>(null)

  const setPanelTransparency = useCallback((isTransparent: boolean) => {
    if (isTransparent) {
      divRef.current!.classList.add("transparent-above-highlight")
    } else {
      divRef.current!.classList.remove("transparent-above-highlight")
    }
  }, [])

  return (
    <div ref={divRef}>
      <BotUIContext value={setPanelTransparency}>
        {props.children}
      </BotUIContext>
    </div>
  )
}
