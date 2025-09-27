import * as React from "react"
import { ThrottlingDetector } from "./ThrottlingDetector.tsx"

export function BotHeader() {
  return (
    <div className="header">
      <div>AutoClick</div>
      <ThrottlingDetector />
    </div>
  )
}
