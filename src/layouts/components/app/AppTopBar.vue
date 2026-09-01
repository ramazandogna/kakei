<script lang="ts" setup>
import { Settings } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import BrandMark from '@/shared/ui/BrandMark.vue'
</script>

<template>
  <header class="flex h-20 w-full shrink-0 items-center justify-between px-2">
    <!-- Both sides reserve the same width so the wordmark stays centred. -->
    <span class="w-11" aria-hidden="true" />

    <h1 class="flex flex-1 justify-center">
      <BrandMark />
    </h1>

    <div class="flex w-11 justify-center">
      <RouterLink
        to="/settings"
        class="text-ink-soft hover:bg-muted hover:text-primary rounded-card flex size-9 items-center justify-center transition-colors active:scale-90"
        :aria-label="$t('topbar.settings')"
      >
        <Settings class="size-[18px]" />
      </RouterLink>
    </div>
  </header>
</template>
