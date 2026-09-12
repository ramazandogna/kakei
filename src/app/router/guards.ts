import { createAuthGuard, createTitleGuard } from 'rei-kit/app'

import { useAuthStore } from '@/features/auth/auth.store'

/**
 * Who may see what, and where the rest go.
 *
 * The kit's guard: the login route and the query key are this app's, the rest
 * is the same two questions every app asks. The return path goes through
 * `toRedirectPath` inside it, so an OAuth fragment never reaches the query
 * string — `redirect.ts` used to do that here.
 */
export const authGuard = createAuthGuard({
  isAuthenticated: () => useAuthStore().isAuthenticated,
  signIn: { name: 'LoginView' },
})

export const titleGuard = createTitleGuard('Kakei')
