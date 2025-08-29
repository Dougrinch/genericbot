import { describe, expect, it } from 'vitest'

describe('test', () => {
  it('it just works', () => {
    document.body.innerHTML = `<div id="root"></div>`
    expect(document.getElementById('root')).toBeTruthy()
  })
})
