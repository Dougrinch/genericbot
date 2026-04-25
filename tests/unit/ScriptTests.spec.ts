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

  test("function call", async () => {
    await expectScriptCompilation({
      elements: [],
      script: `
        fun plusFive(n) {
          return n + 5
        }
        
        alert(plusFive(2))
      `,
      expected: `
        async function plusFive(n) {
          return n + 5;
        };
        
        alert(await plusFive(2));
      `
    })
  })
})
