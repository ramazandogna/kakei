import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkStyling } from 'rei-kit/check'

/**
 * The seam that type-checking cannot see.
 *
 * rei-kit ships compiled components that reference colour roles by name and
 * carry their own scoped stylesheet. Neither is visible to `vue-tsc` or to a
 * component test: a missing token or a missing import produces markup that is
 * still valid, still renders, and is simply unstyled.
 *
 * This file used to assert all of that by hand, and so did Hibi's — the same
 * checks, written separately, three of them under the same names. That is the
 * kit's own test for a missing part, so it took them over in 3.5.0, and the
 * `.dark` trap this file found first went in with it: `@theme` compiles to
 * `:root` while the kit's `.dark` arrives after, so a role rebranded for the
 * day and left for the night comes up in the kit's colours after dark.
 *
 * The kit's version knows two things this one did not. The preset answers
 * several of the questions at once, so an app using one is not asked for them
 * separately. And the filled roles sit in a `:where(.dark)` block that carries
 * no specificity on purpose — the version here only ever read plain `.dark`
 * rules, so those roles were never compared at all.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

describe('rei-kit styling contract', () => {
  it('is wired to the kit', () => {
    const problems = checkStyling({
      css: read('../../assets/main.css'),
      tokens: read('../../../node_modules/rei-kit/dist/tokens.css'),
    })

    expect(problems.map((problem) => `${problem.message} — ${problem.fix ?? ''}`)).toEqual([])
  })
})
