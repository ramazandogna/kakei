<script setup lang="ts">
import { Check } from 'lucide-vue-next'

/**
 * Three fixed entries, ticking themselves.
 *
 * The claim is that the repetitive part is one tap rather than three trips
 * through a form, and a checklist that fills itself is the shortest way to
 * say it.
 */
const ROWS = ['Salary', 'Rent', 'Phone'] as const
</script>

<template>
  <div class="flex w-full max-w-[17rem] flex-col gap-2" aria-hidden="true">
    <div
      v-for="(row, index) in ROWS"
      :key="row"
      class="tick-row border-hair bg-surface flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
      :style="{ animationDelay: `${index * 160}ms` }"
    >
      <span
        class="bg-primary flex size-5 shrink-0 items-center justify-center rounded-md text-white"
      >
        <Check class="size-3 stroke-[3]" />
      </span>
      <span class="text-ink text-sm">{{ row }}</span>
    </div>
  </div>
</template>

<style scoped>
.tick-row {
  opacity: 0;
  animation: tick 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes tick {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tick-row {
    opacity: 1;
    animation: none;
  }
}
</style>
