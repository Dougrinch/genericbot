import CodeMirror, { type Extension } from "@uiw/react-codemirror"
import { useMemo } from "react"
import { useConfig } from "../logic/ConfigManager.ts"
import { javascript } from "@codemirror/lang-javascript"
import { autocompletion, type CompletionContext, type CompletionResult, snippet } from "@codemirror/autocomplete"
import type { BasicSetupOptions } from "@uiw/codemirror-extensions-basic-setup"
import { githubDark } from "@uiw/codemirror-theme-github"

interface ScriptInputProps {
  id: string
  value: string
  onChange: (value: string) => void
}

export function ScriptInput(props: ScriptInputProps) {
  const elements = useConfig(c => c.elements.map(e => e.name))

  const extensions = useMemo<Extension[]>(() => {
    return [
      javascript({ jsx: false }),
      autocompletion({
        override: [(ctx: CompletionContext): CompletionResult | null => {
          const word = ctx.matchBefore(/\w*/)
          if (!word || (word.from === word.to && !ctx.explicit)) return null
          return {
            from: word.from,
            options: [
              { label: "click", type: "function", apply: snippet("click(${1:element})${}") },
              { label: "wait", type: "function", apply: snippet("wait(${1:ms},${2:ms})${}") },
              ...elements.map(e => ({ label: e, type: "variable", apply: `"${e}"` })),
              { label: "repeat", type: "function", apply: snippet("repeat(${1:times}, () => {\n\t${2}\n})${}") }
            ]
          }
        }]
      })
    ]
  }, [elements])

  const basicSetup = useMemo<BasicSetupOptions>(() => {
    return {
      lineNumbers: true,
      dropCursor: true
    }
  }, [])

  return (
    <CodeMirror
      id={props.id}
      minHeight="100px"
      maxHeight="300px"
      theme={githubDark}
      value={props.value}
      onChange={props.onChange}
      extensions={extensions}
      basicSetup={basicSetup}
    />
  )
}
