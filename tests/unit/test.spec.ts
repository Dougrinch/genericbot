import { describe, expect, test } from 'vitest'

describe('test', () => {
  test('it just works', () => {
    document.body.innerHTML = `<div id="root"></div>`
    expect(document.getElementById('root')).toBeTruthy()
  })
})
