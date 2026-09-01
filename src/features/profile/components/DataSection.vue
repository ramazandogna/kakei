<script setup lang="ts">
import { ref } from 'vue'
import { Download, Trash2 } from 'lucide-vue-next'

import {
  BaseButton,
  BaseInput,
  BaseSheet,
  SettingsGroup,
  SettingsRow,
  downloadJson,
  toAppError,
  todayKey,
} from 'rei-kit'

import { deleteAllData, exportEverything } from '../profile.api'
import { useAuthStore } from '@/features/auth/auth.store'
import { queryClient } from '@/app/providers/query'

/**
 * Taking the data out, and taking it away.
 *
 * The delete asks for the account's email to be typed out. It is the one action
 * in the app with nothing behind it, so the confirmation is deliberately more
 * work than a tap.
 */
const auth = useAuthStore()

const isExporting = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')

const confirmOpen = ref(false)
const typedEmail = ref('')

async function exportData() {
  errorMessage.value = ''
  isExporting.value = true

  try {
    downloadJson(await exportEverything(), `kakei-export-${todayKey()}.json`)
  } catch (error) {
    errorMessage.value = toAppError(error).message
  } finally {
    isExporting.value = false
  }
}

async function deleteData() {
  errorMessage.value = ''
  isDeleting.value = true

  try {
    await deleteAllData()
    queryClient.clear()
    confirmOpen.value = false
    typedEmail.value = ''
  } catch (error) {
    errorMessage.value = toAppError(error).message
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <SettingsGroup :title="$t('settings.data')">
    <SettingsRow
      :label="$t('settings.export')"
      :description="$t('settings.exportHint')"
      :icon="Download"
      stacked
    >
      <BaseButton
        variant="ghost"
        size="sm"
        class="self-start"
        :loading="isExporting"
        @click="exportData"
      >
        {{ $t('common.export') }}
      </BaseButton>
    </SettingsRow>

    <SettingsRow
      :label="$t('settings.deleteAll')"
      :description="$t('settings.deleteAllHint')"
      :icon="Trash2"
      interactive
      @click="confirmOpen = true"
    />
  </SettingsGroup>

  <p v-if="errorMessage" role="alert" class="text-negative mt-2 text-sm">{{ errorMessage }}</p>

  <BaseSheet
    v-model="confirmOpen"
    :title="$t('settings.deleteAllTitle')"
    :subtitle="$t('settings.deleteAllBody')"
    :close-label="$t('common.close')"
  >
    <div class="flex flex-col gap-4">
      <BaseInput
        v-model="typedEmail"
        :label="$t('settings.typeEmail')"
        :placeholder="auth.user?.email ?? ''"
        autocomplete="off"
      />

      <BaseButton
        variant="danger"
        :disabled="typedEmail.trim() !== auth.user?.email"
        :loading="isDeleting"
        @click="deleteData"
      >
        {{ $t('common.deletePermanently') }}
      </BaseButton>
      <BaseButton variant="ghost" @click="confirmOpen = false">
        {{ $t('common.cancel') }}
      </BaseButton>
    </div>
  </BaseSheet>
</template>
