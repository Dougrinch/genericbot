import { describe, test } from "vitest"
import { expectScriptCompilation } from "./scriptCompilationTestUtils.ts"

describe("ScriptTests", () => {
  test("repeat", async () => {
    await expectScriptCompilation({
      script: `
        repeat (2) {
          print(1)
        }
      `,
      expected: `
        await repeat(2, async () => {
          print(1);
        });
      `
    })
  })

  test("variable", async () => {
    await expectScriptCompilation({
      variables: ["foo"],
      script: `
        val a = foo + 2
      `,
      expected: `
        let a = foo() + 2;
      `
    })
  })

  test("elementRef", async () => {
    await expectScriptCompilation({
      elements: ["foo"],
      script: `
        val a = foo
        click(a)
      `,
      expected: `
        let a = foo();
        await click(a);
      `
    })
  })

  test("elementClick", async () => {
    await expectScriptCompilation({
      elements: ["foo"],
      script: `
        click(foo)
      `,
      expected: `
        await click(foo());
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
