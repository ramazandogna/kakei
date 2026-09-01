<script lang="ts" setup>
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseButton, EmptyState } from 'rei-kit'

/**
 * Keeps one broken screen from taking the whole app down.
 *
 * This wraps the routed page only, so the shell and the tab bar stay mounted
 * and the user can simply move to another tab -- which is both the fastest
 * recovery and the one they will reach for. A boundary around the entire app
 * would leave them with a dead screen and no way off it.
 *
 * Only errors thrown while rendering a descendant reach `onErrorCaptured`.
 * Rejected promises and failed queries do not, and should not: those belong to
 * the code that owns the request.
 */

const failed = ref(false)
const route = useRoute()

onErrorCaptured((error) => {
  failed.value = true

  // Kept in production too. This is the only trace of a crash a user can be
  // asked to read back, and the fallback deliberately does not show it.
  console.error('[error boundary]', error)

  // Stop here: the app root has no better answer than this component does.
  return false
})

// Navigating away is a recovery, so the fallback must not follow the user to
// the next screen.
watch(
  () => route.fullPath,
  () => {
    failed.value = false
  },
)

/** Last resort, for a module that failed to evaluate and cannot re-render its way out. */
const reload = () => window.location.reload()
</script>

<template>
  <div v-if="failed" class="boundary">
    <EmptyState :title="$t('error.title')" :description="$t('error.body')">
      <template #icon>
        <TriangleAlert class="text-negative size-7" />
      </template>

      <template #action>
        <div class="flex flex-col items-center gap-2">
          <BaseButton @click="failed = false">{{ $t('error.retry') }}</BaseButton>
          <BaseButton variant="ghost" size="sm" @click="reload">
            {{ $t('error.reload') }}
          </BaseButton>
        </div>
      </template>
    </EmptyState>
  </div>

  <slot v-else />
</template>

<style scoped>
@reference "@/assets/main.css";

.boundary {
  @apply flex h-full w-full items-center justify-center px-6 pb-44;
}
</style>
