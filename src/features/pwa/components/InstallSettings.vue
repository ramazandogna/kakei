<script setup lang="ts">
import { InstallSettings as KitInstallSettings } from 'rei-kit/pwa'

/**
 * The way back to installing, in this app's words.
 *
 * The row and its three-way platform check are the kit's (rei-kit 0.14.0);
 * both phone apps had the same thirty-four lines, with no difference at all.
 */
</script>

<template>
  <KitInstallSettings
    :title="$t('install.settingsRow')"
    :label="$t('install.title')"
    :installed-label="$t('install.installed')"
    :body="$t('install.body')"
    :ios-body="$t('install.iosBody')"
    :action="$t('install.action')"
  />
</template>
