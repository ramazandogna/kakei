<script setup lang="ts">
import { computed } from 'vue'
import { CalendarCog, Coins, Palette } from 'lucide-vue-next'

import { SegmentedControl, SettingsGroup, SettingsRow, useTheme } from 'rei-kit'
import type { ThemePreference } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import LanguagePicker from './LanguagePicker.vue'
import { useProfile, useUpdateProfile } from '../profile.queries'
import { SUPPORTED_CURRENCIES } from '@/shared/lib/money'

const { t } = useI18n()

const { data: profile } = useProfile()
const update = useUpdateProfile()
const theme = useTheme()

const THEME_OPTIONS = computed(() => [
  { value: 'system' as ThemePreference, label: t('settings.themeSystem') },
  { value: 'light' as ThemePreference, label: t('settings.themeLight') },
  { value: 'dark' as ThemePreference, label: t('settings.themeDark') },
])

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))

/**
 * Every day the shortest month has, so the setting can never point at a day
 * some months do not reach — which is also why the column is capped at 28.
 */
const MONTH_START_OPTIONS = computed(() =>
  Array.from({ length: 28 }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  })),
)

/**
 * The theme is written to two places: the local singleton so the change is
 * instant, and the profile row so the next device agrees.
 */
const themeModel = computed<ThemePreference>({
  get: () => theme.value,
  set: (next) => {
    theme.value = next
    update.mutate({ theme: next })
  },
})

// `?? 'JPY'` rather than a blank control: the row may still be loading, and an
// unselected segmented control looks broken.
const currencyModel = computed<string>({
  get: () => profile.value?.currency ?? 'JPY',
  set: (next) => update.mutate({ currency: next }),
})

const monthStartModel = computed<number>({
  get: () => profile.value?.month_start_day ?? 1,
  set: (next) => update.mutate({ month_start_day: next }),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <SettingsGroup :title="$t('settings.appearance')">
      <SettingsRow :label="$t('settings.theme')" :icon="Palette" stacked>
        <SegmentedControl v-model="themeModel" :options="THEME_OPTIONS" />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup :title="$t('settings.money')">
      <SettingsRow
        :label="$t('settings.currency')"
        :description="$t('settings.currencyHint')"
        :icon="Coins"
        stacked
      >
        <SegmentedControl v-model="currencyModel" :options="CURRENCY_OPTIONS" />
      </SettingsRow>

      <SettingsRow
        :label="$t('settings.monthStart')"
        :description="$t('settings.monthStartHint')"
        :icon="CalendarCog"
        stacked
      >
        <!-- A select, not a segmented control: twenty-eight options is well past
             where a row of pills stops being readable. -->
        <select
          v-model.number="monthStartModel"
          class="border-hair bg-surface text-ink rounded-card h-11 w-full border px-3 text-sm"
          :aria-label="$t('settings.monthStart')"
        >
          <option v-for="option in MONTH_START_OPTIONS" :key="option.value" :value="option.value">
            {{ $t('settings.monthStartDay', { day: option.label }) }}
          </option>
        </select>
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup :title="$t('settings.language')">
      <LanguagePicker />
    </SettingsGroup>
  </div>
</template>
