import { useMemo } from "react"
import { script } from "./ScriptLanguage.ts"
import { scriptCompletion } from "./ScriptCompletion.ts"
import { linter, lintGutter } from "@codemirror/lint"
import { autocompletion, nextSnippetField } from "@codemirror/autocomplete"
import CodeMirror, { keymap, Prec } from "@uiw/react-codemirror"
import type { BasicSetupOptions } from "@uiw/codemirror-extensions-basic-setup"
import { githubDark } from "@uiw/codemirror-theme-github"
import { useScriptExtensions } from "./ScriptActionFactory.ts"
import { lintResultField, scriptLinter } from "./ScriptLinter.ts"
import { EditorView } from "@codemirror/view"

interface ScriptInputProps {
  id: string
  value: string
  onChange: (value: string) => void
}

export function ScriptInput({ id, value, onChange }: ScriptInputProps) {
  const scriptExtensions = useScriptExtensions()

  const extensions = useMemo(() => {
    return [
      script(),
      lintResultField,
      linter(scriptLinter(scriptExtensions), { delay: 300 }),
      lintGutter(),
      autocompletion({ override: [scriptCompletion(scriptExtensions)] }),
      Prec.highest(keymap.of([{ key: "Enter", run: nextSnippetField }])),
      EditorView.lineWrapping
    ]
  }, [scriptExtensions])

  const basicSetup = useMemo<BasicSetupOptions>(() => {
    return {
      lineNumbers: true
    }
  }, [])

  return (
    <CodeMirror
      id={id}
      className="script-input"
      theme={githubDark}
      extensions={extensions}
      basicSetup={basicSetup}
      value={value}
      onChange={onChange}
    />
  )
}
