/**
 * Telling a publishable Supabase key from a secret one.
 *
 * The anon key is meant to ship inside the bundle — row-level security is the
 * boundary, not the key. The service-role key is the opposite: it bypasses
 * every policy, so a single character of the wrong environment variable turns
 * a public web app into an open database.
 *
 * The two are a copy-and-paste apart in the dashboard, and nothing about the
 * app looks wrong afterwards: it builds, it deploys, and the mistake is only
 * visible to whoever opens the JavaScript. So it is checked, at build time and
 * again at startup.
 *
 * No imports on purpose — `vite.config.ts` loads this too.
 */

/** What a key is allowed to be used for. */
export type ApiKeyKind = 'publishable' | 'secret' | 'unknown'

/** Decodes a JWT payload without verifying it; the signature is not ours to check. */
function jwtClaims(key: string): Record<string, unknown> | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null

  const payload = parts[1]
  if (payload === undefined) return null

  try {
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))

    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Classifies a Supabase API key.
 *
 * Covers both generations: the current `sb_publishable_…` / `sb_secret_…`
 * prefixes, and the legacy JWTs whose `role` claim is `anon` or
 * `service_role`.
 *
 * @param key - The key as configured, untrimmed.
 * @returns `'secret'` for anything that must never reach a browser.
 *
 * @example
 * ```ts
 * classifyApiKey('sb_publishable_abc')  // 'publishable'
 * classifyApiKey('sb_secret_abc')       // 'secret'
 * classifyApiKey(legacyAnonJwt)         // 'publishable'
 * classifyApiKey(legacyServiceRoleJwt)  // 'secret'
 * ```
 */
export function classifyApiKey(key: string): ApiKeyKind {
  const trimmed = key.trim()

  if (trimmed.startsWith('sb_secret_')) return 'secret'
  if (trimmed.startsWith('sb_publishable_')) return 'publishable'

  const claims = jwtClaims(trimmed)
  if (claims === null) return 'unknown'

  if (claims['role'] === 'service_role') return 'secret'
  if (claims['role'] === 'anon') return 'publishable'

  return 'unknown'
}

/**
 * Throws if the key is one that must never be shipped to a browser.
 *
 * Deliberately loud and specific: the failure it prevents is silent, and the
 * message has to be enough to act on without going looking.
 *
 * @param key - The configured anon key.
 * @param where - Named in the message, e.g. `'the build'`.
 */
export function assertPublishableKey(key: string, where: string): void {
  if (classifyApiKey(key) !== 'secret') return

  throw new Error(
    `VITE_SUPABASE_ANON_KEY is a SECRET key, and ${where} would put it in front of ` +
      `every visitor.\n\n` +
      `A secret key bypasses row-level security completely: whoever reads it can read ` +
      `and write every user's data.\n\n` +
      `Fix it where the variable is set:\n` +
      `  • Vercel  → Settings → Environment Variables → VITE_SUPABASE_ANON_KEY\n` +
      `             (check Production, Preview AND Development — all three)\n` +
      `  • locally → .env.local\n\n` +
      `The value it wants is the publishable key: Supabase dashboard → Project ` +
      `Settings → API Keys → the one beginning "sb_publishable_" (older projects: ` +
      `the "anon" "public" JWT, under Legacy API keys).\n\n` +
      `VITE_ variables are baked in at build time, so change the value and then ` +
      `redeploy — editing it alone changes nothing. If the secret key has already ` +
      `been deployed, revoke it in the dashboard first.`,
  )
}
