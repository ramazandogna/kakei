<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { UpdatePrompt as KitUpdatePrompt } from 'rei-kit/pwa'

/**
 * The update prompt for the installed app.
 *
 * `registerType: 'prompt'` means a new service worker waits rather than taking
 * over, so this is what actually applies it. Asking rather than reloading is
 * deliberate: an automatic swap mid-entry loses whatever was being typed, and
 * typing an entry is the whole app.
 *
 * The card is the kit's; the service worker cannot be. `virtual:pwa-register`
 * is a build-time module and a library cannot import one — which is also the
 * right seam, because whether an update is waiting is this app's business.
 */
const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

<template>
  <KitUpdatePrompt
    :open="needRefresh"
    :title="$t('pwa.updateTitle')"
    :body="$t('pwa.updateBody')"
    :action="$t('pwa.reload')"
    :dismiss-label="$t('pwa.later')"
    @update="updateServiceWorker(true)"
    @dismiss="needRefresh = false"
  />
</template>
