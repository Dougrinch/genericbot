import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [{
      test: {
        name: 'unit',
        environment: 'jsdom',
        setupFiles: ['tests/setup.ts'],
        include: ['tests/unit/**/*.spec.{ts,tsx}'],
      },
    }, {
      test: {
        browser: {
          enabled: true,
          provider: 'playwright',
          instances: [{ browser: 'chromium' }],
          headless: true
        },
        setupFiles: ['tests/setup.ts'],
        include: ['tests/ui/**/*.spec.{ts,tsx}'],
      }
    }],
    coverage: {
      provider: "v8",
      include: ['src/widget/**'],
    }
  },
})
