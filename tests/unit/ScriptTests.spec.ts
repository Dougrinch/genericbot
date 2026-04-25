import { describe, test } from "vitest"
import { expectScriptCompilation } from "./scriptCompilationTestUtils.ts"

describe("ScriptTests", () => {
  test("repeat", async () => {
    await expectScriptCompilation({
      elements: ["dig"],
      script: `
        repeat (2) {
          clickDig()
        }
      `,
      expected: `
        await repeat(2, async () => {
          await clickDig();
        });
      `
    })
  })
})
