import { describe, expect, test } from 'vitest'

describe('test', () => {
  test('it just works', async () => {
    expect(document.getElementById('root')).toBeTruthy()

    await import("../../src/widget/injection.tsx")

    expect(document.getElementById('bot')).toBeTruthy()
  })
})
