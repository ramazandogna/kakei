import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../locales/en'
import ja from '../locales/ja'
import tr from '../locales/tr'
import zh from '../locales/zh'

const LOCALES = { en, tr, ja, zh }

/** Every leaf key as a dotted path, e.g. `habit.deleteWithCount`. */
function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  )
}

const KEYS = leafKeys(en)

describe('message catalogue', () => {
  /**
   * The compiler is what turns `{name}` into a render function, and it runs the
   * first time a message is used — not at build time. A stray `@` (vue-i18n's
   * linked-message operator) or `|` (its plural separator) therefore compiles
   * clean, type-checks clean, and throws in the browser. This forces every
   * message through the compiler once.
   */
  it.each(Object.keys(LOCALES))('compiles every message in %s', (locale) => {
    const i18n = createI18n({ legacy: false, locale, messages: LOCALES })

    for (const key of KEYS) {
      expect(() => i18n.global.t(key)).not.toThrow()
    }
  })

  it.each(Object.keys(LOCALES).filter((locale) => locale !== 'en'))(
    '%s has exactly the keys en has',
    (locale) => {
      expect(leafKeys(LOCALES[locale as keyof typeof LOCALES]).sort()).toEqual([...KEYS].sort())
    },
  )
})

/** Every `.ts` and `.vue` file under src, excluding the catalogues themselves. */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)

    if (statSync(path).isDirectory()) {
      if (name !== 'locales') sourceFiles(path, found)
    } else if (path.endsWith('.ts') || path.endsWith('.vue')) {
      found.push(path)
    }
  }

  return found
}

describe('keys the code asks for', () => {
  /**
   * Parity between locales is not enough.
   *
   * A key can land one block off in all four catalogues at once: every locale
   * then agrees, every message compiles, and the app renders the raw key on
   * screen. Only checking the call sites against the catalogue catches that.
   */
  it('all exist in the catalogue', () => {
    const known = new Set(KEYS)
    const missing = new Set<string>()

    for (const file of sourceFiles('src')) {
      const source = readFileSync(file, 'utf8')

      // Literal single-quoted keys only. Template literals like
      // `tone.${name}` are dynamic and cannot be checked here.
      for (const match of source.matchAll(/\$?\bt\(\s*'([a-z][\w.]*)'/gi)) {
        const key = match[1]
        if (key && key.includes('.') && !known.has(key)) missing.add(`${key}  (${file})`)
      }
    }

    expect([...missing].sort()).toEqual([])
  })
})
