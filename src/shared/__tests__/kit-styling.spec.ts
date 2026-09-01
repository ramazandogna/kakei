import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The seam that type-checking cannot see.
 *
 * rei-kit ships compiled components that reference colour roles by name and
 * carry their own scoped stylesheet. Neither is visible to `vue-tsc` or to a
 * component test: a missing token or a missing import produces markup that is
 * still valid, still renders, and is simply unstyled. That is exactly how a
 * release once reached production with the tab bar invisible.
 *
 * So these tests assert the wiring itself, in the stylesheet, at unit-test
 * speed -- no build required.
 */

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const appCss = read('../../assets/main.css')
const kitTokens = read('../../../node_modules/rei-kit/dist/tokens.css')

/** Every `--color-<name>` a stylesheet declares. */
const colourRoles = (css: string) =>
  new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map(([, name]) => name!))

describe('rei-kit styling contract', () => {
  it('defines every colour role the kit expects', () => {
    const missing = [...colourRoles(kitTokens)].filter((role) => !colourRoles(appCss).has(role))

    // A role the kit names but the app never defines compiles to nothing:
    // `bg-primary` silently emits no declaration at all.
    expect(
      missing,
      `main.css is missing colour roles used by rei-kit: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it("loads the kit's scoped component styles", () => {
    // BaseSheet's transitions and TabBar's layout live here. Without it the tab
    // bar keeps its markup and loses its position entirely.
    expect(appCss).toMatch(/@import\s+['"]rei-kit\/styles\.css['"]/)
  })

  it('tells Tailwind to scan the kit for utility classes', () => {
    // Tailwind generates a utility only where it has seen the class, and it
    // does not walk node_modules unless pointed at it.
    expect(appCss).toMatch(/@source\s+['"][^'"]*node_modules\/rei-kit[^'"]*['"]/)
  })
})
