import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Text on a filled role is the role's own, never white.
 *
 * Kakei's pigments lighten at night on purpose — the deep teal is unreadable
 * on a dark ground — and `main.css` already declares what to write on them
 * after dark: `--color-on-primary: #061518` and the rest. The markup wrote
 * `text-white` instead, which does not follow, so every filled badge and
 * button in dark mode sat below AA while the app's own stylesheet said
 * otherwise:
 *
 *   primary 3.35:1, positive 2.98:1, warning 2.53:1 — against 5.55, 6.25
 *   and 7.37 for the colours this app had already chosen.
 *
 * Nothing reported it. The light mode passes, the type-check sees two class
 * names, and the night is where it goes wrong — so the rule is asserted here
 * rather than left to somebody opening the app after dark.
 */
const ROOT = 'src'

function vueFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

describe('a filled role carries its own text colour', () => {
  const files = vueFiles(ROOT)

  it('finds the components, so the case below is not vacuous', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files)('%s', (path) => {
    const source = readFileSync(path, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    expect(source.match(/\btext-(white|black)\b/g) ?? []).toEqual([])
  })
})
