<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeRedirect } from 'rei-kit'
import { toAuthMessageKey } from 'rei-kit/supabase'
import { AuthForm, fieldErrors } from 'rei-kit/app'
import type { AuthFormValues } from 'rei-kit/app'

import { signupSchema } from '@/features/auth/auth.schema'
import { useAuthStore } from '@/features/auth/auth.store'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const serverError = ref('')
const busy = ref(false)
const awaitingConfirmation = ref(false)
const confirmationEmail = ref('')

// The template has no wrapping div: `AuthForm` is already the
// `flex flex-col gap-5` column the old hand-written version opened with, and
// nesting a second one around a single child is a div that does nothing.
const validate = (values: AuthFormValues) => fieldErrors(signupSchema(), values)

async function onSubmit(values: AuthFormValues) {
  serverError.value = ''
  busy.value = true

  try {
    const { needsEmailConfirmation } = await auth.signUp(values.email, values.password)

    if (needsEmailConfirmation) {
      confirmationEmail.value = values.email
      awaitingConfirmation.value = true
    } else {
      await router.push(safeRedirect(route.query.redirect))
    }
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
  } finally {
    busy.value = false
  }
}

async function signUpWithGoogle() {
  serverError.value = ''
  busy.value = true

  try {
    await auth.signInWithGoogle()
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
    busy.value = false
  }
}
</script>

<template>
  <p v-if="awaitingConfirmation" role="status" class="text-ink text-center text-sm">
    {{ $t('auth.checkInbox', { email: confirmationEmail }) }}
  </p>

  <AuthForm
    v-else
    mode="signUp"
    :busy="busy"
    :error="serverError ? $t(serverError) : ''"
    :validate="validate"
    :labels="{
      email: $t('auth.email'),
      password: $t('auth.password'),
      confirmPassword: $t('auth.confirmPassword'),
      submit: $t('auth.createAccount'),
      submitBusy: $t('auth.creatingAccount'),
      google: $t('auth.google'),
      or: $t('auth.or'),
      passwordHint: $t('auth.passwordHint'),
      emailPlaceholder: $t('auth.emailPlaceholder'),
    }"
    @submit="onSubmit"
    @google="signUpWithGoogle"
  >
    <template #header>
      <header class="flex flex-col gap-1 text-center">
        <h2 class="text-ink text-lg font-semibold">{{ $t('auth.startTracking') }}</h2>
        <p class="text-ink-soft text-sm">{{ $t('auth.startTrackingHint') }}</p>
      </header>
    </template>

    <template #foot>
      <p class="text-ink-soft text-center text-sm">
        {{ $t('auth.alreadyHave') }}
        <RouterLink to="/login" class="text-primary font-medium">{{
          $t('auth.signIn')
        }}</RouterLink>
      </p>
    </template>
  </AuthForm>
</template>
