import { cleanup, configure } from "vitest-browser-react/pure";
import { afterEach } from "vitest";

configure({
  reactStrictMode: true,
})

afterEach(() => {
  cleanup()
})
