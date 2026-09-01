<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

import { toAuthMessageKey } from '@/features/auth/auth.errors'
import { signupSchema } from '@/features/auth/auth.schema'
import { useAuthStore } from '@/features/auth/auth.store'
import { BaseButton, BaseInput, GoogleButton, safeRedirect } from 'rei-kit'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const serverError = ref('')
const awaitingConfirmation = ref(false)

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(signupSchema()),
})

const [email, emailAttrs] = defineField('email', { validateOnModelUpdate: false })
const [password, passwordAttrs] = defineField('password', { validateOnModelUpdate: false })
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword', {
  validateOnModelUpdate: false,
})

const onSubmit = handleSubmit(async (values) => {
  serverError.value = ''

  try {
    const { needsEmailConfirmation } = await auth.signUp(values.email, values.password)

    if (needsEmailConfirmation) {
      awaitingConfirmation.value = true
    } else {
      await router.push(safeRedirect(route.query.redirect))
    }
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
  }
})

async function signUpWithGoogle() {
  serverError.value = ''

  try {
    await auth.signInWithGoogle()
  } catch (error) {
    serverError.value = toAuthMessageKey(error)
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p v-if="awaitingConfirmation" role="status" class="text-ink text-center text-sm">
      {{ $t('auth.checkInbox', { email }) }}
    </p>

    <template v-else>
      <header class="flex flex-col gap-1 text-center">
        <h2 class="text-ink text-lg font-semibold">{{ $t('auth.startTracking') }}</h2>
        <p class="text-ink-soft text-sm">{{ $t('auth.startTrackingHint') }}</p>
      </header>

      <GoogleButton :label="$t('auth.google')" @click="signUpWithGoogle" />

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
          autocomplete="new-password"
          :hint="$t('auth.passwordHint')"
          :error="errors.password"
        />

        <BaseInput
          v-model="confirmPassword"
          v-bind="confirmPasswordAttrs"
          :label="$t('auth.confirmPassword')"
          type="password"
          autocomplete="new-password"
          :error="errors.confirmPassword"
        />

        <p v-if="serverError" role="alert" class="text-negative text-sm">{{ $t(serverError) }}</p>

        <BaseButton type="submit" :loading="isSubmitting">
          {{ isSubmitting ? $t('auth.creatingAccount') : $t('auth.createAccount') }}
        </BaseButton>
      </form>

      <p class="text-ink-soft text-center text-sm">
        {{ $t('auth.alreadyHave') }}
        <RouterLink to="/login" class="text-primary font-medium">{{
          $t('auth.signIn')
        }}</RouterLink>
      </p>
    </template>
  </div>
</template>
