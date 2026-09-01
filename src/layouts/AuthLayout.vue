<script setup lang="ts">
import { LocaleLinks } from 'rei-kit'

import { SUPPORTED_LOCALES, useLocalePreference } from '@/shared/i18n'
import BrandMark from '@/shared/ui/BrandMark.vue'

/**
 * Endonyms: a language is always listed in its own language, so someone who
 * cannot read the current interface can still find theirs.
 */
const ENDONYM = { en: 'English', tr: 'Türkçe', ja: '日本語', zh: '中文' }

const preference = useLocalePreference()
</script>

<template>
  <div
    class="flex min-h-0 w-full flex-1 flex-col items-center gap-8 overflow-y-auto px-6 pt-10 pb-10"
  >
    <BrandMark size="lg" />

    <main class="w-full max-w-[22rem]">
      <slot />
    </main>

    <!-- Sign-in is the first screen a new user sees, and Settings is behind it.
         Without this, someone who does not read the browser's language has no
         way to switch before creating an account. -->
    <LocaleLinks
      v-model="preference"
      class="mt-auto"
      :locales="SUPPORTED_LOCALES"
      :labels="ENDONYM"
      :label="$t('settings.language')"
    />
  </div>
</template>
