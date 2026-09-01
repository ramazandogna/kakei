/**
 * Checks the configured Supabase key against the configured project, before a
 * deploy does it the expensive way.
 *
 * Three mistakes have all cost this project a live outage or worse: a secret
 * key where the publishable one belongs, a key borrowed from another project,
 * and a variable that was never set. Each is invisible until the app is in
 * front of someone. Each takes one request to rule out.
 *
 * Reads .env.local, falling back to the real environment so CI can use it too.
 *
 *   pnpm check:env
 */
import { readFileSync } from 'node:fs'

/** Parses the subset of dotenv syntax this project uses. */
function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const file = readEnvFile('.env.local')
// Trimmed: a value pasted from a dashboard routinely arrives with a newline,
// and an untrimmed blank would reach `new URL()` and crash with a stack trace
// instead of saying which variable is missing.
const read = (name) => (process.env[name] ?? file[name] ?? '').trim()

const url = read('VITE_SUPABASE_URL')
const key = read('VITE_SUPABASE_ANON_KEY')

const problems = []
const notes = []

if (!url) problems.push('VITE_SUPABASE_URL is not set.')
if (!key) problems.push('VITE_SUPABASE_ANON_KEY is not set.')

/** The project a key belongs to, and what it is allowed to do. */
function describeKey(value) {
  if (value.startsWith('sb_secret_')) return { kind: 'secret', ref: null }
  if (value.startsWith('sb_publishable_')) return { kind: 'publishable', ref: null }

  const [, payload] = value.split('.')
  if (!payload) return { kind: 'unknown', ref: null }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const kind =
      claims.role === 'anon'
        ? 'publishable'
        : claims.role === 'service_role'
          ? 'secret'
          : 'unknown'

    return { kind, ref: claims.ref ?? null }
  } catch {
    return { kind: 'unknown', ref: null }
  }
}

if (url && key) {
  const { kind, ref } = describeKey(key)
  const urlRef = new URL(url).hostname.split('.')[0]

  if (kind === 'secret') {
    problems.push(
      'VITE_SUPABASE_ANON_KEY is a SECRET key. It bypasses every row-level\n' +
        '  security policy, and VITE_ variables are inlined into the bundle — this\n' +
        '  would publish it. Use the anon / publishable key instead.',
    )
  } else if (kind === 'unknown') {
    // Not fatal: a future key format should not block a deploy.
    notes.push('The key format is not one this script recognises; it was not classified.')
  }

  // A legacy JWT names its project; a publishable key does not, so only the
  // request below can speak for that one.
  if (ref && ref !== urlRef) {
    problems.push(
      `The key belongs to project "${ref}" but the URL points at "${urlRef}".\n` +
        '  A key from another project is rejected with 401 on every request.',
    )
  }
}

if (problems.length === 0 && url && key) {
  const endpoint = `${url.replace(/\/$/, '')}/auth/v1/settings`

  try {
    const response = await fetch(endpoint, { headers: { apikey: key } })

    if (!response.ok) {
      problems.push(
        `The project rejected the key: HTTP ${response.status} from /auth/v1/settings.\n` +
          `  ${(await response.text()).slice(0, 200)}`,
      )
    } else {
      const settings = await response.json()
      const providers = Object.entries(settings.external ?? {})
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)

      console.log(`  project    ${new URL(url).hostname}`)
      console.log(`  key        accepted (${describeKey(key).kind})`)
      console.log(`  providers  ${providers.join(', ') || 'none enabled'}`)

      if (!providers.includes('google')) {
        notes.push(
          'Google is not enabled on this project, so the Google button will fail.\n' +
            '  Authentication → Sign In / Providers → Google.',
        )
      }
    }
  } catch (error) {
    problems.push(`Could not reach ${endpoint}: ${error.message}`)
  }
}

for (const note of notes) console.warn(`\n  note: ${note}`)

if (problems.length > 0) {
  console.error('\nThe Supabase configuration is not usable:\n')
  for (const problem of problems) console.error(`  • ${problem}`)
  console.error('')
  process.exit(1)
}

console.log('\n  Configuration looks usable.\n')
