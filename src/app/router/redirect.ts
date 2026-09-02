import type { RouteLocationNormalized } from 'vue-router'

/**
 * Where to send someone back to after signing in, without the fragment.
 *
 * Supabase's implicit OAuth flow hands the browser back with the access and
 * refresh tokens in the URL fragment. A fragment is client-side only — it is
 * never sent to a server. Copied into a query parameter it stops being one:
 * `/login?redirect=/%23access_token=…` is sent on the very next request and
 * lands in the host's access logs, in `Referer` headers and in browser history.
 *
 * So the redirect keeps the path and the query and drops everything from the
 * `#`. There is nothing after it worth returning to anyway.
 *
 * Its own module, not part of `guards.ts`: the guards reach the auth store and
 * through it the Supabase client, which throws at import when the environment
 * is not configured. This is a pure string function and its test should need
 * nothing but the string.
 *
 * @example
 * ```ts
 * toRedirectPath({ fullPath: '/ledger?direction=out' })  // '/ledger?direction=out'
 * toRedirectPath({ fullPath: '/#access_token=abc' })     // '/'
 * ```
 */
export function toRedirectPath(to: Pick<RouteLocationNormalized, 'fullPath'>): string {
  const [path] = to.fullPath.split('#')

  return path === undefined || path === '' ? '/' : path
}
