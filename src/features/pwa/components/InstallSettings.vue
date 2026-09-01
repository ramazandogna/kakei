<script setup lang="ts">
import { CheckCircle2, Download, Share } from 'lucide-vue-next'

import { useInstall } from '../install'
import { BaseButton, SettingsGroup, SettingsRow } from 'rei-kit'

/**
 * The way back to installing after the card has been dismissed.
 *
 * The card snoozes for a week; without this row, someone who tapped "Not now"
 * and then changed their mind would have nowhere to go.
 */
const { isInstalled, canPrompt, needsManualSteps, prompt } = useInstall()
</script>

<template>
  <SettingsGroup
    v-if="isInstalled || canPrompt || needsManualSteps"
    :title="$t('install.settingsRow')"
  >
    <SettingsRow
      :label="isInstalled ? $t('install.installed') : $t('install.title')"
      :description="
        isInstalled ? '' : needsManualSteps ? $t('install.iosBody') : $t('install.body')
      "
      :icon="isInstalled ? CheckCircle2 : needsManualSteps ? Share : Download"
      stacked
    >
      <BaseButton v-if="canPrompt" variant="primary" size="sm" class="self-start" @click="prompt">
        {{ $t('install.action') }}
      </BaseButton>
    </SettingsRow>
  </SettingsGroup>
</template>
