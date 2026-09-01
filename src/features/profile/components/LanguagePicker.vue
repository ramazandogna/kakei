<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Languages } from 'lucide-vue-next'

import { SUPPORTED_LOCALES, useLocalePreference } from '@/shared/i18n'
import type { LocalePreference } from '@/shared/i18n'
import { BaseSheet, SettingsRow } from 'rei-kit'

const preference = useLocalePreference()

/**
 * Endonyms: a language is always listed in its own language, so someone who
 * cannot read the current interface can still find theirs.
 */
const ENDONYM: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English',
  tr: 'Türkçe',
  ja: '日本語',
  zh: '中文',
}

const open = ref(false)

/** Five options is past the point where a segmented control still reads. */
const options = computed<{ value: LocalePreference; label: string }[]>(() => [
  { value: 'system', label: '' },
  ...SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: ENDONYM[locale] })),
])

const currentLabel = computed(() =>
  preference.value === 'system' ? '' : ENDONYM[preference.value],
)

function select(value: LocalePreference) {
  preference.value = value
  open.value = false
}
</script>

<template>
  <SettingsRow
    :label="$t('settings.language')"
    :description="$t('settings.languageHint')"
    :icon="Languages"
    interactive
    @click="open = true"
  >
    <span class="text-ink-soft text-sm">
      {{ currentLabel || $t('settings.languageSystem') }}
    </span>
  </SettingsRow>

  <BaseSheet
    v-model="open"
    :title="$t('settings.language')"
    :subtitle="$t('settings.languageHint')"
    :close-label="$t('common.close')"
  >
    <ul class="flex flex-col">
      <li v-for="option in options" :key="option.value">
        <button
          type="button"
          class="hover:bg-muted/60 flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors"
          :aria-pressed="preference === option.value"
          @click="select(option.value)"
        >
          <span class="text-ink flex-1 text-base">
            {{ option.label || $t('settings.languageSystem') }}
          </span>
          <Check
            v-if="preference === option.value"
            class="text-primary size-5 shrink-0"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </BaseSheet>
</template>
