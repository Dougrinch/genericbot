import { expect, test } from 'vitest'
import { render } from "vitest-browser-react";
import App from "../../src/page/App.tsx";

test('renders name', async () => {
  const a = render(<div id={'root'}><App/></div>)

  await expect.element(a.getByText('Vite + React')).toBeInTheDocument()

  await a.getByRole('button', { hasText: 'count' }).click()

  await expect.element(a.getByText('count is 1')).toBeInTheDocument()
})
