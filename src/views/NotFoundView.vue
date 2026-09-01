<script lang="ts" setup>
import { Compass } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import { EmptyState } from 'rei-kit'
</script>

<template>
  <div class="flex w-full flex-col justify-center">
    <EmptyState :title="$t('notFound.title')" :description="$t('notFound.description')">
      <template #icon><Compass class="size-6" /></template>
      <template #action>
        <RouterLink
          to="/"
          class="bg-primary rounded-card flex h-11 items-center justify-center px-4 text-base font-medium text-white transition-transform duration-100 active:scale-95"
        >
          {{ $t('notFound.action') }}
        </RouterLink>
      </template>
    </EmptyState>
  </div>
</template>
