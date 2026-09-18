/**
 * jsdom does not implement a few DOM APIs that the bot relies on when it
 * observes a page. They are polyfilled once for every unit test from
 * `setup.unit.ts` so that the real element/variable pipelines can run
 * unmodified against a jsdom document.
 */
export function installJsdomPolyfills(): void {
  installCheckVisibility()
  installInnerText()
  installLocalStorage()
}

/**
 * `Element.checkVisibility()` is used by the elements pipeline to drop hidden
 * matches. jsdom has no layout, so visibility is approximated from the things a
 * test can actually control: `hidden` and `display`. Like the real no-argument
 * call, `visibility` and `opacity` are deliberately not considered.
 */
function installCheckVisibility(): void {
  if (typeof Element.prototype.checkVisibility === "function") {
    return
  }

  Element.prototype.checkVisibility = function (this: Element): boolean {
    return isVisible(this)
  }
}

function isVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false
  }

  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (node instanceof HTMLElement && node.hidden) {
      return false
    }
    if (getComputedStyle(node).display === "none") {
      return false
    }
  }

  return true
}

/**
 * `HTMLElement.innerText` is what variables read their value from. jsdom only
 * implements `textContent`, which keeps the source formatting, so collapse
 * whitespace the way a rendering engine would.
 */
function installInnerText(): void {
  if ("innerText" in HTMLElement.prototype) {
    return
  }

  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get(this: HTMLElement): string {
      return (this.textContent ?? "").replace(/\s+/g, " ").trim()
    },
    set(this: HTMLElement, value: string) {
      this.textContent = value
    }
  })
}

/**
 * The config is loaded from `localStorage` in the `ConfigManager` constructor.
 * jsdom does not always expose one, so install an in-memory stand-in.
 */
function installLocalStorage(): void {
  const existing = (globalThis as { localStorage?: Partial<Storage> }).localStorage
  if (typeof existing?.getItem === "function" && typeof existing.setItem === "function") {
    return
  }

  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    }
  }

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage
  })
}
