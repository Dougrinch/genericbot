import { type CompilationResult, compiler } from "./ScriptCompiler.ts"
import { useCallback, useMemo, useState } from "react"
import { script } from "./ScriptLanguage.ts"
import { scriptCompletion } from "./ScriptCompletion.ts"
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint"
import { autocompletion, nextSnippetField } from "@codemirror/autocomplete"
import CodeMirror, { keymap, Prec } from "@uiw/react-codemirror"
import type { BasicSetupOptions } from "@uiw/codemirror-extensions-basic-setup"
import { githubDark } from "@uiw/codemirror-theme-github"
import { EditorView } from "@codemirror/view"
import { javascript } from "@codemirror/lang-javascript"
import { syntaxTree } from "@codemirror/language"
import { useScriptExtensions } from "./ScriptRunner.ts"
import { lintResultField, scriptLinter } from "./ScriptLinter.ts"

interface ScriptInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onCompilation?: (value: CompilationResult | null) => void
}

export function ScriptInput({ id, value, onChange, onCompilation }: ScriptInputProps) {
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const onCompilationResult = useCallback((result: CompilationResult | null) => {
    onCompilation?.(result)
    setCompilationResult(result)
  }, [onCompilation])

  const scriptExtensions = useScriptExtensions()

  const extensions = useMemo(() => {
    return [
      script(),
      lintResultField,
      linter(scriptLinter(scriptExtensions), { delay: 300 }),
      lintGutter(),
      autocompletion({ override: [scriptCompletion(scriptExtensions)] }),
      Prec.highest(keymap.of([{ key: "Enter", run: nextSnippetField }])),
      compiler(onCompilationResult)
    ]
  }, [onCompilationResult, scriptExtensions])

  const basicSetup = useMemo<BasicSetupOptions>(() => {
    return {
      lineNumbers: true
    }
  }, [])

  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      <CodeMirror
        id={id}
        minHeight="100px"
        maxHeight="300px"
        theme={githubDark}
        extensions={extensions}
        basicSetup={basicSetup}
        value={value}
        onChange={onChange}
      />
      <CodeMirror
        theme={githubDark}
        value={compilationResult?.code}
        extensions={[
          EditorView.lineWrapping,
          javascript(),
          linter(view => {
            const diagnostics: Diagnostic[] = []
            const tree = syntaxTree(view.state)
            tree.cursor().iterate(node => {
              if (node.type.isError) {
                diagnostics.push({
                  from: node.from,
                  to: node.to,
                  severity: "error",
                  message: "Syntax error"
                })
              }
            })

            return diagnostics
          })
        ]}
      />
    </div>
  )
}
