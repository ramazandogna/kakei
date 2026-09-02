<script setup lang="ts">
/**
 * The same four amounts, sorted twice.
 *
 * The slide's claim is that a list of numbers becomes a judgement the moment
 * each one is marked. Showing the same column re-coloured says it faster than
 * a sentence.
 */
const ROWS = [
  { width: '86%', need: true },
  { width: '54%', need: false },
  { width: '38%', need: true },
  { width: '22%', need: false },
] as const
</script>

<template>
  <div class="flex w-full max-w-[18rem] flex-col gap-2" aria-hidden="true">
    <div
      v-for="(row, index) in ROWS"
      :key="index"
      class="bar-row flex items-center gap-2"
      :style="{ animationDelay: `${index * 90}ms` }"
    >
      <span
        class="h-6 rounded-md"
        :class="row.need ? 'bg-positive' : 'bg-warning'"
        :style="{ width: row.width }"
      />
      <span class="text-[11px] font-semibold" :class="row.need ? 'text-positive' : 'text-warning'">
        {{ row.need ? $t('necessity.need') : $t('necessity.want') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.bar-row {
  opacity: 0;
  animation: slide 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes slide {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar-row {
    opacity: 1;
    animation: none;
  }
}
</style>
