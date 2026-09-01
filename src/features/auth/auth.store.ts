import { defineStore } from 'pinia'
import { computed, shallowRef, ref } from 'vue'

import { setRememberMe, supabase } from '@/shared/lib/supabase'

import type { User } from '@supabase/supabase-js'

import { queryClient } from '@/app/providers/query'
import { activeLocale } from '@/shared/i18n'
import { clearOAuthReturn, readOAuthReturn } from './oauth-return'

export const useAuthStore = defineStore('auth', () => {
  const user = shallowRef<User | null>(null)
  const isReady = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  /**
   * Why the last redirect back from a provider did not produce a session.
   *
   * A message key, shown by LoginView. Without it a rejected OAuth return is
   * indistinguishable from never having signed in: `getSession()` reports no
   * session and no error of its own, so the router quietly sends the user back
   * to the sign-in screen with nothing to go on.
   */
  const oauthError = ref('')

  let initialized = false

  async function init() {
    if (initialized) return
    initialized = true

    // Read before `getSession()`: on success `auth-js` consumes the fragment,
    // so afterwards there is nothing left to tell us a return even happened.
    const returned = readOAuthReturn()

    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      user.value = data.session?.user ?? null

      if (returned.kind !== 'none' && user.value === null) {
        oauthError.value =
          returned.kind === 'error' && returned.description
            ? returned.description
            : 'authError.oauthFailed'
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
        if (session) oauthError.value = ''
      })
    } finally {
      // Whatever happened, the tokens do not stay in the address bar. On the
      // happy path auth-js has already removed them; this is the other path.
      clearOAuthReturn()
      isReady.value = true
    }
  }

  /**
   * Creates the account, carrying the active language into the database.
   *
   * The signup trigger seeds a set of preset categories, and it runs before the
   * app has ever spoken to Postgres — so the language has to arrive as user
   * metadata or the seed can only be in English. Google sign-in has no such
   * hook, and falls back to English by design.
   */
  async function signUp(
    email: string,
    password: string,
  ): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { locale: activeLocale.value } },
    })
    if (error) throw error

    if (data.session) user.value = data.session.user

    return { needsEmailConfirmation: data.session === null }
  }

  async function signIn(email: string, password: string, remember = true) {
    setRememberMe(remember)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  /**
   * Starts the Google redirect flow.
   *
   * Resolves when the browser is about to navigate away, so callers should not
   * expect a session on return — the app reloads and `init()` picks it up.
   */
  async function signInWithGoogle(remember = true) {
    setRememberMe(remember)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    queryClient.clear()
  }

  return {
    user,
    isReady,
    isAuthenticated,
    oauthError,
    init,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }
})
