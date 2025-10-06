export type ScriptExternals = {
  functions: Map<string, FunctionDescriptor>
  variables: Map<string, VariableDescriptor>
}

export type FunctionDescriptor = {
  readonly name: string
  readonly async: boolean
  readonly arguments: {
    readonly name: string
    readonly async: boolean
    readonly implicit?: boolean
  }[]
  readonly lastAsBlock?: boolean
}

export type VariableDescriptor = {
  readonly name: string
  readonly async: boolean
}
