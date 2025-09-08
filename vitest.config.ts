import { defineConfig } from "vitest/config"
import type { BrowserInstanceOption } from "vitest/node"

export default defineConfig({
  test: {
    projects: [{
      test: {
        name: "unit",
        environment: "jsdom",
        setupFiles: ["tests/setup.shared.ts", "tests/unit/setup.unit.ts"],
        include: ["tests/unit/**/*.spec.{ts,tsx}"]
      }
    }, {
      test: {
        browser: {
          enabled: true,
          provider: "playwright",
          instances: [{
            browser: "chromium",
            launch: {
              args: ["--remote-debugging-port=9222"]
            }
          } as BrowserInstanceOption],
          headless: true,
          viewport: {
            width: 1024,
            height: 768
          }
        },
        setupFiles: ["tests/setup.shared.ts", "tests/ui/setup.ui.ts"],
        include: ["tests/ui/**/*.spec.{ts,tsx}"]
      },
      optimizeDeps: {
        include: ["react/jsx-dev-runtime"]
      }
    }],
    coverage: {
      provider: "v8",
      include: ["src/bot/**", "src/utils/**"]
    }
  }
})
