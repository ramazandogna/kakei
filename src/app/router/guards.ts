import type { NavigationGuard, NavigationHookAfter } from 'vue-router'
import { useAuthStore } from '@/features/auth/auth.store'
import { safeRedirect } from 'rei-kit'

import { toRedirectPath } from './redirect'

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
