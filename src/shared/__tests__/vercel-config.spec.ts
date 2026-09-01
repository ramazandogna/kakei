import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * `vercel.json` is deployment configuration, so nothing in the app imports it
 * and no type checker looks at it. It is validated against a remote schema at
 * deploy time — by which point a mistake is a failed build, or worse a
 * successful one that serves the wrong thing.
 *
 * Two rules have already cost a broken deploy each: a `//` comment key, which
 * the schema rejects outright, and a blanket rewrite, which answered requests
 * for missing chunks with `index.html` and a 200.
 */

// Vitest runs from the project root, which is where the config lives — the
// same way `supabase-client.spec.ts` reads vite.config.ts.
const config: unknown = JSON.parse(readFileSync('vercel.json', 'utf8'))

interface VercelConfig {
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

const vercel = config as VercelConfig

/** Every property name in the file, at any depth. */
function keys(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(keys)

  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]) => [key, ...keys(value)])
  }

  return []
}

describe('vercel.json', () => {
  it('carries no comment keys — the schema rejects any it does not define', () => {
    // JSON has no comments, and Vercel does not make an exception. A `//` key
    // anywhere fails the build with "should NOT have additional property".
    expect(keys(config).filter((key) => key.startsWith('//'))).toEqual([])
  })

  describe('the SPA rewrite', () => {
    const pattern = new RegExp(`^${vercel.rewrites[0]?.source ?? ''}$`)

    it.each(['/', '/ledger', '/insights', '/profile', '/settings', '/login', '/anything'])(
      'answers %s with the shell, because every route is client-side',
      (path) => {
        expect(pattern.test(path)).toBe(true)
      },
    )

    it.each([
      '/assets/index-DuanxngM.js',
      '/assets/MonthView-C_S-70J8.js',
      '/assets/index-abc.css',
      '/sw.js',
      '/workbox-2fbc6a65.js',
      '/manifest.webmanifest',
    ])('leaves %s alone, so a missing one 404s instead of returning HTML', (path) => {
      // A rewrite here is what produced "Expected a JavaScript-or-Wasm module
      // script but the server responded with a MIME type of text/html" for
      // every tab left open across a deploy.
      expect(pattern.test(path)).toBe(false)
    })
  })

  describe('caching', () => {
    const ruleFor = (source: string) =>
      vercel.headers.find((rule) => rule.source === source)?.headers[0]?.value ?? ''

    it.each(['/', '/index.html', '/sw.js'])('never caches %s', (source) => {
      // The entry document is the only file that knows which hashed chunks
      // belong to this build. A cached copy keeps asking for the previous one.
      expect(ruleFor(source)).toMatch(/max-age=0/)
      expect(ruleFor(source)).toMatch(/must-revalidate/)
    })

    it('caches hashed assets forever', () => {
      // The content behind a hashed name can never change, so revalidating is
      // pure latency.
      expect(ruleFor('/assets/(.*)')).toMatch(/immutable/)
      expect(ruleFor('/assets/(.*)')).toMatch(/max-age=31536000/)
    })
  })
})
