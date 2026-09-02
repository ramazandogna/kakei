<script setup lang="ts">
/**
 * The Month screen's donut, drawn small.
 *
 * The same arithmetic the real one uses — a stroke dasharray around a unit
 * circle — so the slide is a picture of the product rather than a poster
 * about it.
 */
const RADIUS = 1
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const SLICES = [
  { share: 0.42, colour: 'var(--color-tone-clay)' },
  { share: 0.24, colour: 'var(--color-tone-indigo)' },
  { share: 0.18, colour: 'var(--color-tone-teal)' },
  { share: 0.1, colour: 'var(--color-tone-rose)' },
]

let travelled = 0

const arcs = SLICES.map((slice) => {
  const length = slice.share * CIRCUMFERENCE
  const offset = -travelled

  travelled += length

  return { colour: slice.colour, dash: `${length} ${CIRCUMFERENCE - length}`, offset }
})
</script>

<template>
  <svg viewBox="0 0 3 3" class="size-32 -rotate-90" aria-hidden="true">
    <circle
      cx="1.5"
      cy="1.5"
      :r="RADIUS"
      fill="none"
      stroke="var(--color-muted)"
      stroke-width="0.4"
    />
    <circle
      v-for="(arc, index) in arcs"
      :key="index"
      class="arc"
      cx="1.5"
      cy="1.5"
      :r="RADIUS"
      fill="none"
      :stroke="arc.colour"
      stroke-width="0.4"
      :stroke-dasharray="arc.dash"
      :stroke-dashoffset="arc.offset"
      :style="{ animationDelay: `${index * 120}ms` }"
    />
  </svg>
</template>

<style scoped>
.arc {
  opacity: 0;
  animation: appear 0.45s ease forwards;
}

@keyframes appear {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .arc {
    opacity: 1;
    animation: none;
  }
}
</style>
