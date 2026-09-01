<script setup lang="ts">
import { computed } from 'vue'

import { toneColor } from '@/shared/lib/tones'
import type { CategorySlice } from '../report.types'

/**
 * Spending by top-level category, hand-rolled.
 *
 * A chart library would cost more gzipped than this whole screen, would need
 * its own theming to follow the tokens, and would still need work to be
 * readable to a screen reader. A donut is an arc and a rotation.
 *
 * The drawing is a summary; the table under it is the product. The SVG is
 * `aria-hidden` for exactly that reason — a screen reader gets the numbers, not
 * a description of a picture of them.
 */
const { slices, total } = defineProps<{
  slices: CategorySlice[]
  /** Total for the direction, in minor units. Slices are shares of this. */
  total: number
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

/** A circle of radius 1, drawn as a stroke so the hole needs no second path. */
const RADIUS = 1
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Each slice as a dash pattern and an offset.
 *
 * `stroke-dasharray` draws `length` of stroke then a gap the rest of the way
 * round; `stroke-dashoffset` rotates where it starts. Together that is a slice,
 * with no path arithmetic at all.
 */
const arcs = computed(() => {
  let travelled = 0

  return slices
    .filter((slice) => slice.currentMinor > 0)
    .map((slice) => {
      const fraction = total > 0 ? slice.currentMinor / total : 0
      const length = fraction * CIRCUMFERENCE
      const offset = -travelled

      travelled += length

      return {
        id: slice.id,
        colour: toneColor(slice.tone),
        dash: `${length} ${CIRCUMFERENCE - length}`,
        offset,
      }
    })
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <svg viewBox="0 0 3 3" class="size-40 -rotate-90" aria-hidden="true">
      <!-- The track, so a period with one small category still reads as a ring
           rather than as a stray arc floating in space. -->
      <circle
        cx="1.5"
        cy="1.5"
        :r="RADIUS"
        fill="none"
        stroke="var(--color-muted)"
        stroke-width="0.42"
      />

      <circle
        v-for="arc in arcs"
        :key="arc.id ?? 'none'"
        cx="1.5"
        cy="1.5"
        :r="RADIUS"
        fill="none"
        :stroke="arc.colour"
        stroke-width="0.42"
        :stroke-dasharray="arc.dash"
        :stroke-dashoffset="arc.offset"
      />
    </svg>

    <!-- The table. Every chart in this app carries one, or is one. -->
    <ul class="flex w-full flex-col">
      <li v-for="slice in slices" :key="slice.id ?? 'none'">
        <button type="button" class="legend-row" @click="emit('select', slice.id)">
          <span
            class="size-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: toneColor(slice.tone) }"
            aria-hidden="true"
          />

          <span class="text-ink min-w-0 flex-1 truncate text-left text-sm">
            {{ slice.name ?? $t('transaction.uncategorised') }}
          </span>

          <span class="tnum text-ink-soft w-10 shrink-0 text-right text-xs">
            {{ slice.sharePercent }}%
          </span>

          <span class="tnum text-ink w-24 shrink-0 text-right text-sm font-medium">
            <slot name="amount" :slice="slice" />
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.legend-row {
  @apply hover:bg-muted/50 flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors;
}
</style>
