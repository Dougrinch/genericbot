import { type PropsWithChildren, useEffect, useState } from "react"

function useCss(): string | null {
  const [value, setValue] = useState<string | null>(null)

  useEffect(() => {
    let ignored = false
    const loadCss = async () => {
      const initial = await import("./bot.css?inline")
      if (!ignored) {
        setValue(initial.default)

        if (import.meta.hot) {
          import.meta.hot.accept("./bot.css?inline", updated => {
            if (!ignored) {
              setValue(updated!.default as string)
            }
          })
        }
      }
    }
    void loadCss()
    return () => {
      ignored = true
    }
  }, [])

  return value
}

export function BotCSS(props: PropsWithChildren) {
  const css = useCss()
  if (css === null) {
    return null
  }

  return (
    <>
      <style>{css}</style>
      {props.children}
    </>
  )
}
