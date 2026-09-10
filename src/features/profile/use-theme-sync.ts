import { computed } from 'vue'
import { useThemeSync as adoptStoredTheme } from 'rei-kit/app'

import { useProfile } from './profile.queries'
import { useAuthStore } from '@/features/auth/auth.store'

/**
 * Adopts the theme stored on the account.
 *
 * The *once* is the whole of it, and it is the kit's now (rei-kit 0.13.0):
 * running at the root rather than on the settings screen, and never adopting
 * twice so a refetch cannot undo a choice the user just made. Hibi had the
 * same thirty-five lines.
 *
 * What stays here is where the value comes from.
 */
export function useThemeSync() {
  const auth = useAuthStore()
  const { data: profile } = useProfile(() => auth.isAuthenticated)

  adoptStoredTheme(computed(() => profile.value?.theme))
}
