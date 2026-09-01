import { watch } from 'vue'

import { useProfile } from './profile.queries'
import { useAuthStore } from '@/features/auth/auth.store'
import { isThemePreference, useTheme } from 'rei-kit'

/**
 * Adopts the theme stored on the account, once, as soon as it arrives.
 *
 * Called from the app root rather than the settings screen: otherwise a user on
 * a fresh device keeps the system theme until they happen to open Profile.
 *
 * Runs once and never again, so a later refetch cannot undo a choice the user
 * just made locally.
 */
export function useThemeSync() {
  const auth = useAuthStore()
  const theme = useTheme()
  const { data: profile } = useProfile(() => auth.isAuthenticated)

  let adopted = false

  watch(
    profile,
    (next) => {
      if (adopted || !next) return

      adopted = true
      if (isThemePreference(next.theme) && next.theme !== theme.value) {
        theme.value = next.theme
      }
    },
    { immediate: true },
  )
}
