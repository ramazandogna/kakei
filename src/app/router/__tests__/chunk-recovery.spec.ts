import { describe, expect, it } from 'vitest'

import { isChunkLoadError, shouldReload } from '../chunk-recovery'

/**
 * Every route is a dynamic import with a hashed filename, so a tab left open
 * across a deploy is one tab change away from a blank screen. This is what
 * turns that into a reload.
 */

describe('isChunkLoadError', () => {
  it.each([
    // Chrome and Firefox.
    'Failed to fetch dynamically imported module: https://app/assets/MonthView-C_S.js',
    'error loading dynamically imported module: /assets/LedgerView.js',
    // Safari.
    'Importing a module script failed.',
    // What a server that answers a script request with the SPA shell produces.
    'Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".',
  ])('recognises %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('leaves ordinary failures alone — reloading would hide a real bug', () => {
    expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(false)
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError('some string')).toBe(false)
  })
})

describe('shouldReload', () => {
  /** A stand-in for sessionStorage that the test can inspect. */
  function storage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial))

    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    }
  }

  it('reloads the first time', () => {
    expect(shouldReload(1_000_000, storage())).toBe(true)
  })

  it('refuses a second reload straight away, so it cannot loop', () => {
    const store = storage()

    expect(shouldReload(1_000_000, store)).toBe(true)
    expect(shouldReload(1_000_500, store)).toBe(false)
    expect(shouldReload(1_009_999, store)).toBe(false)
  })

  it('allows another attempt once the window has passed', () => {
    const store = storage()

    expect(shouldReload(1_000_000, store)).toBe(true)
    expect(shouldReload(1_011_000, store)).toBe(true)
  })

  it('still reloads when storage is blocked', () => {
    // Private mode: losing the loop guard is better than never recovering.
    expect(shouldReload(1_000_000, null)).toBe(true)
  })

  it('ignores a value it did not write', () => {
    expect(shouldReload(1_000_000, storage({ 'kakei-chunk-reload': 'nonsense' }))).toBe(true)
  })
})
