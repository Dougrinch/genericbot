import { useMemo } from "react"
import CodeMirror, { EditorState } from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { xpath } from "./XPathLanguage.ts"
import { githubDark } from "@uiw/codemirror-theme-github"
import type { BasicSetupOptions } from "@uiw/codemirror-extensions-basic-setup"
import { type Diagnostic, linter } from "@codemirror/lint"
import { syntaxTree } from "@codemirror/language"

interface XPathInputProps {
  id: string
  value: string
  onChange: (value: string) => void
}

export function XPathInput({ id, value, onChange }: XPathInputProps) {
  const extensions = useMemo(() => {
    return [
      xpath(),
      EditorState.transactionFilter.of(tr => {
        return tr.newDoc.lines > 1 ? [] : [tr]
      }),
      EditorView.lineWrapping,
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
      }, { delay: 100 })
    ]
  }, [])

  const basicSetup = useMemo<BasicSetupOptions>(() => {
    return {
      lineNumbers: false,
      foldGutter: true
    }
  }, [])

  return (
    <CodeMirror
      id={id}
      theme={githubDark}
      extensions={extensions}
      basicSetup={basicSetup}
      value={value}
      onChange={onChange}
    />
  )
}
