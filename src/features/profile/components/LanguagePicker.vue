<script setup lang="ts">
import { computed } from 'vue'
import { LocaleSheet } from 'rei-kit/app'

import { SUPPORTED_LOCALES, useLocalePreference } from '@/shared/i18n'

/**
 * Endonyms: a language is always listed in its own language, so someone who
 * cannot read the current interface can still find theirs. The kit cannot know
 * them, which is why they live here.
 */
const ENDONYM: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English',
  tr: 'Türkçe',
  ja: '日本語',
  zh: '中文',
}

const preference = useLocalePreference()

const options = computed(() =>
  SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: ENDONYM[locale] })),
)
</script>

<template>
  <LocaleSheet
    v-model="preference"
    :label="$t('settings.language')"
    :hint="$t('settings.languageHint')"
    :system-label="$t('settings.languageSystem')"
    :close-label="$t('common.close')"
    :options="options"
  />
</template>
