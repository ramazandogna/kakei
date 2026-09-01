<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

import { Plus } from 'lucide-vue-next'

import { BaseSheet, tapFeedback, useOnline } from 'rei-kit'
import AppNavbar from '@/layouts/components/app/AppNavbar.vue'
import AppTopBar from '@/layouts/components/app/AppTopBar.vue'

/**
 * Loaded on demand, not with the app.
 *
 * The form brings the category picker and the whole categories query with it,
 * for a sheet the first paint never shows. The sheet animates for ~280ms, which
 * is longer than the chunk takes to arrive on a connection that has already
 * loaded the app.
 */
const TransactionForm = defineAsyncComponent(
  () => import('@/features/transactions/components/TransactionForm.vue'),
)

const isOnline = useOnline()

/** Adding money is reachable from every screen, not just the Ledger. */
const createOpen = ref(false)

function openCreate() {
  tapFeedback()
  createOpen.value = true
}
</script>

<template>
  <div class="app-layout global-wrapper">
    <AppTopBar />

    <AppNavbar />

    <!-- Floating, not in flow: connectivity flickers in lifts and tunnels, and
         a banner that reflows the page each time is worse than the outage. -->
    <Transition name="offline">
      <p v-if="!isOnline" role="status" class="offline-banner">{{ $t('offline') }}</p>
    </Transition>

    <!--
    Content
    -->
    <main class="page-content">
      <slot />
    </main>

    <div class="fab-slot">
      <button type="button" class="fab" @click="openCreate">
        <Plus class="fab-icon" aria-hidden="true" />
        <span class="fab-label">{{ $t('transaction.new') }}</span>
      </button>
    </div>

    <BaseSheet
      v-model="createOpen"
      :title="$t('transaction.new')"
      :subtitle="$t('transaction.newSubtitle')"
      :close-label="$t('common.close')"
    >
      <TransactionForm @saved="createOpen = false" />
    </BaseSheet>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

/* min-height: 0 lets these flex items shrink below their content, which is
   what allows .page-slide's own overflow-y-auto to take over. Without it the
   default min-height: auto pushes the layout past the shell and nothing
   scrolls. */
.app-layout {
  display: flex;
  flex-grow: 1;
  min-height: 0;
}

.page-content {
  @apply relative mt-2 min-h-0 w-full grow overflow-hidden;
}

/* Under the top bar rather than above the content, so showing and hiding it
   costs no layout. */
.offline-banner {
  @apply bg-warning/90 text-ink absolute left-1/2 z-30 w-full max-w-[360px] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-medium shadow-md backdrop-blur-sm;
  top: 4.75rem;
}

.offline-enter-active,
.offline-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}

.offline-enter-from,
.offline-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .offline-enter-from,
  .offline-leave-to {
    transform: translate(-50%, 0);
  }
}

/* Shares the tab bar's column so the button lines up with the bar's right edge
   at every width. Anchoring it to the layout instead put it 400px away from the
   shell on a desktop screen. */
.fab-slot {
  @apply pointer-events-none absolute left-1/2 z-40 flex w-full max-w-[360px] -translate-x-1/2 justify-end px-4;
  bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
}

/* An extended FAB: a bare "+" says nothing about what it adds, and this is the
   one action the whole app is built around. */
.fab {
  @apply bg-primary pointer-events-auto flex h-12 items-center gap-1.5 rounded-full pr-5 pl-4 text-white shadow-lg transition-transform duration-150 active:scale-95;
  /* A ring in the canvas colour separates it from whatever scrolls behind. */
  box-shadow:
    0 0 0 4px var(--color-canvas),
    0 10px 24px -8px color-mix(in srgb, var(--color-primary) 60%, transparent);
}

.fab-icon {
  @apply size-5 shrink-0 stroke-[2.5px];
}

.fab-label {
  @apply text-sm font-semibold whitespace-nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .fab {
    transition: none;
  }
}

.global-wrapper {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
