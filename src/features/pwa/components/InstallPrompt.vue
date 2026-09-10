<script setup lang="ts">
import { InstallPrompt as KitInstallPrompt } from 'rei-kit/pwa'

/**
 * The install card, in Kakei's words.
 *
 * The card itself is the kit's (rei-kit 0.13.0): the three-way platform check,
 * the week-long snooze, and the shape. Hibi had the same 111 lines, differing
 * in the storage key below and a colour.
 */
</script>

<template>
  <KitInstallPrompt
    storage-key="kakei-install-nudge"
    :title="$t('install.title')"
    :body="$t('install.body')"
    :action="$t('install.action')"
    :later="$t('install.later')"
    :ios-title="$t('install.iosTitle')"
    :ios-body="$t('install.iosBody')"
  />
</template>
