import type { NavigationGuard, NavigationHookAfter, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/auth.store'
import { safeRedirect } from 'rei-kit'

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

export const authGuard: NavigationGuard = (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'LoginView', query: { redirect: toRedirectPath(to) } }
  }

  return true
}

export const guestGuard: NavigationGuard = (to) => {
  const auth = useAuthStore()

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return safeRedirect(to.query.redirect)
  }

  return true
}

export const titleGuard: NavigationHookAfter = (to) => {
  document.title = `${to.meta.title} · Kakei`
}
