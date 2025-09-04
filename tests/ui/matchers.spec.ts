import { describe, expect, test } from "vitest"
import { page } from "@vitest/browser/context"

describe("matchers", () => {
  test("sync map", () => {
    expect({ foo: "foo" }).map(o => o.foo).toEqual("foo")
    expect({ foo: "foo" }).map(o => o.foo).not.toEqual("bar")
  })

  test("async map", async () => {
    await page.getBySelector("#root").expect()
      .map(es => es.id)
      .toEqual("root")

    await page.getBySelector("#root").expect()
      .map(es => es.id)
      .not
      .toEqual("bug")
  })
})
