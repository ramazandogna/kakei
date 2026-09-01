import { defineStore } from 'pinia'
import { computed, shallowRef, ref } from 'vue'

import { setRememberMe, supabase } from '@/shared/lib/supabase'

import type { User } from '@supabase/supabase-js'

import { queryClient } from '@/app/providers/query'

export const useAuthStore = defineStore('auth', () => {
  const user = shallowRef<User | null>(null)
  const isReady = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  let initialized = false

  async function init() {
    if (initialized) return
    initialized = true

    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      user.value = data.session?.user ?? null

      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })
    } finally {
      isReady.value = true
    }
  }

  async function signUp(
    email: string,
    password: string,
  ): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password })
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

  return { user, isReady, isAuthenticated, init, signUp, signIn, signInWithGoogle, signOut }
})
