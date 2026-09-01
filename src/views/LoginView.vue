<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

import { toAuthMessageKey } from '@/features/auth/auth.errors'
import { loginSchema } from '@/features/auth/auth.schema'
import { useAuthStore } from '@/features/auth/auth.store'
import { BaseButton, BaseInput, GoogleButton, safeRedirect } from 'rei-kit'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const serverError = ref('')
const rememberMe = ref(true)

/**
 * A sign-in that came back from Google without a session.
 *
 * Read once on mount rather than bound: it describes the navigation that landed
 * here, and it must not reappear after the user has moved on.
 */
const returnError = ref(auth.oauthError)
auth.oauthError = ''

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginSchema()),
})

const [email, emailAttrs] = defineField('email', { validateOnModelUpdate: false })
const [password, passwordAttrs] = defineField('password', { validateOnModelUpdate: false })

const onSubmit = handleSubmit(async (values) => {
  serverError.value = ''

  try {
    await auth.signIn(values.email, values.password, rememberMe.value)
    await router.push(safeRedirect(route.query.redirect))
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
  }
})

async function signInWithGoogle() {
  serverError.value = ''
  returnError.value = ''

  try {
    await auth.signInWithGoogle(rememberMe.value)
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-1 text-center">
      <h2 class="text-ink text-lg font-semibold">{{ $t('auth.welcomeBack') }}</h2>
      <p class="text-ink-soft text-sm">{{ $t('auth.pickUp') }}</p>
    </header>

    <p v-if="returnError && !serverError" role="alert" class="text-negative text-center text-sm">
      {{ returnError.includes(' ') ? returnError : $t(returnError) }}
    </p>

    <GoogleButton :label="$t('auth.google')" @click="signInWithGoogle" />

    <div class="flex items-center gap-3">
      <span class="bg-hair h-px flex-1" />
      <span class="text-ink-soft text-xs">{{ $t('auth.or') }}</span>
      <span class="bg-hair h-px flex-1" />
    </div>

    <form novalidate class="flex flex-col gap-4" @submit="onSubmit">
      <BaseInput
        v-model="email"
        v-bind="emailAttrs"
        :label="$t('auth.email')"
        type="email"
        autocomplete="email"
        :placeholder="$t('auth.emailPlaceholder')"
        :error="errors.email"
      />

      <BaseInput
        v-model="password"
        v-bind="passwordAttrs"
        :label="$t('auth.password')"
        type="password"
        autocomplete="current-password"
        :error="errors.password"
      />

      <label class="text-ink-soft flex items-center gap-2 text-sm">
        <input v-model="rememberMe" type="checkbox" class="accent-primary size-4" />
        {{ $t('auth.rememberMe') }}
      </label>

      <p v-if="serverError" role="alert" class="text-negative text-sm">{{ $t(serverError) }}</p>

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? $t('auth.signingIn') : $t('auth.signIn') }}
      </BaseButton>
    </form>

    <p class="text-ink-soft text-center text-sm">
      {{ $t('auth.noAccount') }}
      <RouterLink to="/signup" class="text-primary font-medium">{{
        $t('auth.createOne')
      }}</RouterLink>
    </p>
  </div>
</template>
