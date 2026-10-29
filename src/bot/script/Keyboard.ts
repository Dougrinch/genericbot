export function pressKey(key: string): void {
  const init: KeyboardEventInit = {
    key,
    code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key,
    bubbles: true,
    cancelable: true
  }
  document.dispatchEvent(new KeyboardEvent("keydown", init))
  document.dispatchEvent(new KeyboardEvent("keyup", init))
}
