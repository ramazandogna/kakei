<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue'

import { Plus } from 'lucide-vue-next'

import { BaseSheet } from 'rei-kit'
import { FabButton, OfflineBanner } from 'rei-kit/app'
import { useOnboarding } from '@/features/onboarding/onboarding'
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

/** A screen shown once, ever — it has no business on the critical path. */
const OnboardingTour = defineAsyncComponent(
  () => import('@/features/onboarding/components/OnboardingTour.vue'),
)

// First run only. Mounted here rather than in a view so it survives tab changes
// and covers the chrome as well as the page.
const tour = useOnboarding()
onMounted(tour.openIfFirstRun)

/**
 * Latches on first open and never lets go.
 *
 * Gating the component on `isOpen` alone would tear it out of the DOM the
 * instant it closes, so its leave transition would never play. This defers the
 * chunk for a returning user without costing the animation.
 */
const tourMounted = ref(false)
watch(tour.isOpen, (open) => {
  if (open) tourMounted.value = true
})

/** Adding money is reachable from every screen, not just the Ledger. */
const createOpen = ref(false)
</script>

<template>
  <div class="app-layout global-wrapper">
    <AppTopBar />

    <AppNavbar />

    <OfflineBanner :label="$t('offline')" />

    <!--
    Content
    -->
    <main class="page-content">
      <slot />
    </main>

    <FabButton :label="$t('transaction.new')" @click="createOpen = true">
      <Plus />
    </FabButton>

    <OnboardingTour v-if="tourMounted" />

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
