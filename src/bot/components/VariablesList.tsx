import { VariableRow } from "./VariableRow"
import { useConfig } from "../ConfigContext.ts"

export function VariablesList() {
  const variables = useConfig(c => c.variables)

  if (variables.length === 0) {
    return null
  }

  return (
    <div className="variables">
      <div className="variables-container">
        {variables.map(variable => (
          <VariableRow key={variable.id} variable={variable} />
        ))}
      </div>
    </div>
  )
}
