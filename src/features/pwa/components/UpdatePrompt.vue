<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { RefreshCw, X } from 'lucide-vue-next'

/**
 * The update prompt for the installed app.
 *
 * `registerType: 'prompt'` means a new service worker waits rather than taking
 * over, so this is what actually applies it. Asking rather than reloading is
 * deliberate: an automatic swap mid-entry loses whatever was being
 * typed, and typing an entry is the whole app.
 */
const { needRefresh, updateServiceWorker } = useRegisterSW()
</script>

<template>
  <Transition name="update">
    <aside v-if="needRefresh" class="update-card" role="status">
      <span class="update-icon" aria-hidden="true">
        <RefreshCw class="size-4" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-ink text-sm font-semibold">{{ $t('pwa.updateTitle') }}</p>
        <p class="text-ink-soft text-xs leading-snug">{{ $t('pwa.updateBody') }}</p>
      </div>

      <button type="button" class="update-action" @click="updateServiceWorker(true)">
        {{ $t('pwa.reload') }}
      </button>

      <button
        type="button"
        class="text-ink-soft hover:text-ink flex size-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90"
        :aria-label="$t('pwa.later')"
        @click="needRefresh = false"
      >
        <X class="size-4" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
@reference "@/assets/main.css";

/* Sits above the tab bar and the action button, because it outranks both — but
   inside the shell, so on desktop it does not float off into the page. */
.update-card {
  @apply border-hair bg-surface/95 absolute left-1/2 z-50 flex w-full max-w-[360px] -translate-x-1/2 items-center gap-3 border p-3 shadow-xl backdrop-blur-md;
  border-radius: var(--radius-card);
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}

.update-icon {
  @apply bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl;
}

.update-action {
  @apply bg-primary shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold text-white transition-transform duration-100 active:scale-95;
}

.update-enter-active,
.update-leave-active {
  transition:
    opacity 250ms ease,
    transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
}

.update-enter-from,
.update-leave-to {
  opacity: 0;
  transform: translate(-50%, 1rem);
}

@media (prefers-reduced-motion: reduce) {
  .update-enter-from,
  .update-leave-to {
    transform: translate(-50%, 0);
  }
}
</style>
