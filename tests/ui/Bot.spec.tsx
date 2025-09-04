import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Bot from "../../src/bot/Bot.tsx"

describe("Bot", () => {
  test("Bot renders correctly", async () => {
    render(<Bot />)

    await page.getByText(/Add Variable/).expect().not.toBeVisible()
    await page.getByTitle("Configuration").click()
    await page.getByText(/Add Variable/).expect().toBeVisible()

    await page.getByText("Edit").nth(1).click()

    // page.getByRole("textbox").element()
    // (page.getByPlaceholder("Variable Name").element() as HTMLElement).focus()

    // page.getByRole("select").element()
    // page.getByText(/^Name.*XPath.*Regex.*Type.*$/)
    // console.log(page.getByRole("select").element())
    // await page.getByRole("textbox", { name: "Regex" }).fill("1234132")
    // await page.getByRole("combobox", { name: "Type" }).selectOptions("String")
    //
    // await userEvent.keyboard("{Shift}")

    // page.getByLabelText("Name").element()
  })
})
