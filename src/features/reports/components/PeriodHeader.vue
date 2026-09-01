<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import { formatDate, fromDateKey, tapFeedback } from 'rei-kit'
import type { Period } from '@/shared/lib/period'

/**
 * The month stepper.
 *
 * Names the period and steps it. When the period is not a calendar month —
 * anyone budgeting from payday — the label falls back to the two dates, because
 * calling 25 February to 24 March "February" would be a lie in either direction.
 */
const { period, canStepForward } = defineProps<{
  period: Period
  /** False on the current period: there is nothing to step into yet. */
  canStepForward: boolean
}>()

const emit = defineEmits<{ step: [months: number] }>()

/** A period is a calendar month exactly when it starts on the 1st. */
const isCalendarMonth = computed(() => period.start.endsWith('-01'))

const label = computed(() => {
  const start = fromDateKey(period.start)

  if (isCalendarMonth.value) {
    return formatDate(start, { month: 'long', year: 'numeric' })
  }

  const end = fromDateKey(period.end)
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

  return `${formatDate(start, options)} – ${formatDate(end, options)}`
})

function step(months: number) {
  tapFeedback()
  emit('step', months)
}
</script>

<template>
  <header class="flex items-center justify-between gap-2">
    <button
      type="button"
      class="stepper"
      :aria-label="$t('month.previousPeriod')"
      @click="step(-1)"
    >
      <ChevronLeft class="size-5" />
    </button>

    <h1 class="text-ink flex-1 text-center text-base font-semibold">{{ label }}</h1>

    <button
      type="button"
      class="stepper"
      :aria-label="$t('month.nextPeriod')"
      :disabled="!canStepForward"
      @click="step(1)"
    >
      <ChevronRight class="size-5" />
    </button>
  </header>
</template>

<style scoped>
@reference "@/assets/main.css";

.stepper {
  @apply text-ink-soft hover:text-ink hover:bg-muted flex size-10 items-center justify-center rounded-full transition-colors active:scale-90 disabled:pointer-events-none disabled:opacity-30;
}
</style>
