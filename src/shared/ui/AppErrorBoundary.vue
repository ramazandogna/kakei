<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseButton, EmptyState, ErrorBoundary } from 'rei-kit'

/**
 * Keeps one broken screen from taking the whole app down.
 *
 * This wraps the routed page only, so the shell and the tab bar stay mounted
 * and the user can simply move to another tab -- which is both the fastest
 * recovery and the one they will reach for. A boundary around the entire app
 * would leave them with a dead screen and no way off it.
 *
 * The catching is the kit's now (rei-kit 0.4.0). All three apps in this
 * workshop had written the same twenty lines -- catch, report, clear on
 * navigation -- and only the icon, the wording and the way out differed, which
 * is exactly the part that should. So this file is down to the half that is
 * Kakei's.
 */
const route = useRoute()

/**
 * Kept in production too. This is the only trace of a crash a user can be
 * asked to read back, and the fallback deliberately does not show it.
 */
const report = (cause: unknown) => console.error('[error boundary]', cause)

/** Last resort, for a module that failed to evaluate and cannot re-render its way out. */
const reload = () => window.location.reload()
</script>

<template>
  <!-- Navigating away is a recovery, so the fallback must not follow the user
       to the next screen. -->
  <ErrorBoundary :reset-key="route.fullPath" @error="report">
    <template #fallback="{ reset }">
      <div class="boundary">
        <EmptyState :title="$t('error.title')" :description="$t('error.body')">
          <template #icon>
            <TriangleAlert class="text-negative mx-auto size-7" />
          </template>

          <template #action>
            <div class="flex flex-col items-center gap-2">
              <BaseButton @click="reset">{{ $t('error.retry') }}</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="reload">
                {{ $t('error.reload') }}
              </BaseButton>
            </div>
          </template>
        </EmptyState>
      </div>
    </template>

    <slot />
  </ErrorBoundary>
</template>

<style scoped>
@reference "@/assets/main.css";

.boundary {
  @apply flex h-full w-full items-center justify-center px-6 pb-44;
}
</style>
