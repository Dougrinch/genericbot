import { describe, test } from "vitest"
import { expectScriptCompilation, expectScriptCompilationError } from "./scriptCompilationTestUtils.ts"

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

  test("waitFor", async () => {
    await expectScriptCompilation({
      elements: ["foo"],
      script: `
        waitFor(foo)
      `,
      expected: `
        await waitFor(foo(), signal);
      `
    })
  })

  test("unary not", async () => {
    await expectScriptCompilation({
      variables: ["foo", "bar"],
      script: `
        val a = !foo
        val b = !(foo == bar)
      `,
      expected: `
        let a = !foo();
        let b = !(foo() === bar());
      `
    })
  })
})

describe("custom functions", () => {
  test("a function without parameters", async () => {
    await expectScriptCompilation({
      script: `
        fun greet() {
          print("hi")
        }

        greet()
      `,
      expected: `
        async function greet() {
          print("hi");
        };
        await greet();
      `,
      usedFunctions: ["print"]
    })
  })

  test("a function with several parameters", async () => {
    await expectScriptCompilation({
      script: `
        fun add(a, b) {
          return a + b
        }

        print(add(1, add(2, 3)))
      `,
      expected: `
        async function add(a,b) {
          return a + b;
        };
        print(await add(1, await add(2, 3)));
      `
    })
  })

  test("a body awaits the async externals it calls, implicit arguments included", async () => {
    await expectScriptCompilation({
      elements: ["foo"],
      script: `
        fun poke() {
          click(foo)
          wait(10)
        }

        poke()
      `,
      expected: `
        async function poke() {
          await click(foo());
          await wait(10, signal);
        };
        await poke();
      `,
      usedFunctions: ["click", "wait"],
      usedVariables: ["foo", "signal"]
    })
  })

  test("a body reads an external variable through the context, not a capture", async () => {
    await expectScriptCompilation({
      variables: ["foo"],
      script: `
        fun current() {
          return foo
        }

        print(current())
      `,
      expected: `
        async function current() {
          return foo();
        };
        print(await current());
      `,
      usedFunctions: ["print"],
      usedVariables: ["foo"]
    })
  })

  test("a function can call itself", async () => {
    await expectScriptCompilation({
      script: `
        fun countdown(n) {
          if (n > 0) {
            countdown(n - 1)
          }
        }

        countdown(3)
      `,
      expected: `
        async function countdown(n) {
          if (n > 0) {
            await countdown(n - 1);
          };
        };
        await countdown(3);
      `
    })
  })

  test("a function declared inside another one", async () => {
    await expectScriptCompilation({
      script: `
        fun outer() {
          fun inner() {
            print(1)
          }

          inner()
        }

        outer()
      `,
      expected: `
        async function outer() {
          async function inner() {
            print(1);
          };
          await inner();
        };
        await outer();
      `
    })
  })

  test("a call is awaited wherever it appears", async () => {
    await expectScriptCompilation({
      variables: ["foo"],
      script: `
        fun done() {
          return foo >= 2
        }

        while (!done()) {
          print(foo)
        }
      `,
      expected: `
        async function done() {
          return foo() >= 2;
        };
        while (!await done()) {
          print(foo());
        };
      `
    })
  })

  test("a call is rejected above its declaration", async () => {
    await expectScriptCompilationError({
      script: `
        fun outer() {
          return inner()
        }

        fun inner() {
          return 1
        }
      `,
      error: /Function "inner" not declared/
    })
  })

  test("a call is rejected outside the block the function is declared in", async () => {
    await expectScriptCompilationError({
      script: `
        if (true) {
          fun nested() {
            print(1)
          }
        }

        nested()
      `,
      error: /Function "nested" not declared/
    })
  })

  test("too many arguments are rejected", async () => {
    await expectScriptCompilationError({
      script: `
        fun single(a) {
          return a
        }

        print(single(1, 2))
      `,
      error: /Too many arguments for "fun single\(a\)"/
    })
  })

  test("a missed argument is rejected", async () => {
    await expectScriptCompilationError({
      script: `
        fun single(a) {
          return a
        }

        print(single())
      `,
      error: /Missed argument "a" for "fun single\(a\)"/
    })
  })

  test("a trailing block is rejected for a function that takes none", async () => {
    await expectScriptCompilationError({
      script: `
        fun plain() {
          print(1)
        }

        plain() {
          print(2)
        }
      `,
      error: /Too many arguments for "fun plain\(\)"/
    })
  })

  test("declaring the same function twice is rejected", async () => {
    await expectScriptCompilationError({
      script: `
        fun same() {
          return 1
        }

        fun same() {
          return 2
        }
      `,
      error: /Function "same" already declared/
    })
  })

  test("a declaration that shadows an external function is rejected", async () => {
    await expectScriptCompilationError({
      script: `
        fun click() {
          print(1)
        }
      `,
      error: /Function "click" already declared/
    })
  })

  test("a parameter that shadows a variable in scope is rejected", async () => {
    await expectScriptCompilationError({
      variables: ["foo"],
      script: `
        fun read(foo) {
          return foo
        }
      `,
      error: /Variable "foo" already declared/
    })
  })
})
