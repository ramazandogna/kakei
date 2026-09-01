import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * An icon that sits against the edge of its own tinted square is the kind of
 * thing type-checking cannot see and a component test would not notice: the
 * markup is valid, the icon renders, it is simply in the wrong place.
 *
 * Two rules, both learned from the same bug in rei-kit's EmptyState, which
 * centred vertically and not horizontally.
 */

function vueFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)

    if (statSync(path).isDirectory()) vueFiles(path, found)
    else if (path.endsWith('.vue')) found.push(path)
  }

  return found
}

const files = vueFiles('src').map((path) => ({ path, source: readFileSync(path, 'utf8') }))

describe('icons sit in the middle of their box', () => {
  it('every fixed-size flex box that centres one axis centres the other', () => {
    const offenders: string[] = []

    for (const { path, source } of files) {
      source.split('\n').forEach((line, index) => {
        for (const [, classes] of line.matchAll(/class="([^"]*)"/g)) {
          const isIconBox = /\bsize-\d/.test(classes) && /\bflex\b/.test(classes)
          if (!isIconBox || classes.includes('flex-col')) continue

          if (classes.includes('items-center') && !classes.includes('justify-center')) {
            offenders.push(`${path}:${index + 1}`)
          }
        }
      })
    }

    expect(offenders, `icon boxes centred on one axis only: ${offenders.join(', ')}`).toEqual([])
  })

  it("every EmptyState icon centres itself inside the kit's box", () => {
    // rei-kit 0.2.1 centres that box vertically only. Fixed in the kit, but the
    // installed version is what renders today, so the glyph carries `mx-auto`.
    const offenders: string[] = []

    for (const { path, source } of files) {
      for (const [, body] of source.matchAll(/<template #icon>([\s\S]*?)<\/template>/g)) {
        if (body.includes('<') && !body.includes('mx-auto')) offenders.push(path)
      }
    }

    expect(offenders, `EmptyState icons without mx-auto: ${offenders.join(', ')}`).toEqual([])
  })
})
