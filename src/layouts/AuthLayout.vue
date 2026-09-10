<script setup lang="ts">
import { LocaleLinks } from 'rei-kit'
import { AuthShell } from 'rei-kit/app'

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
  <AuthShell>
    <template #brand><BrandMark size="lg" /></template>

    <slot />

    <!-- Sign-in is the first screen a new user sees, and Settings is behind it.
         Without this, someone who does not read the browser's language has no
         way to switch before creating an account. -->
    <template #foot>
      <LocaleLinks
        v-model="preference"
        :locales="SUPPORTED_LOCALES"
        :labels="ENDONYM"
        :label="$t('settings.language')"
      />
    </template>
  </AuthShell>
</template>
