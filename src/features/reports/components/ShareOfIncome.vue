<script setup lang="ts">
import { computed } from 'vue'

import { toneColor } from '@/shared/lib/tones'
import { share } from '@/shared/lib/money'
import { useMoney } from '@/features/profile/use-money'
import type { CategorySlice } from '../report.types'

/**
 * What each category ate of what came in — `rent 30%, junk food 10%` — with
 * the leftover shown as what was kept.
 *
 * A table with a bar drawn on each row, rather than a chart with a table under
 * it: the percentages are the point, and a row that is 30% wide says the same
 * thing again for free.
 */
const { slices, incomeMinor } = defineProps<{
  slices: CategorySlice[]
  /** What came in this period, in minor units. */
  incomeMinor: number
}>()

const { format } = useMoney()

const rows = computed(() =>
  slices
    .filter((slice) => slice.currentMinor > 0)
    .map((slice) => ({ ...slice, percent: share(slice.currentMinor, incomeMinor) })),
)

const spentMinor = computed(() => slices.reduce((sum, slice) => sum + slice.currentMinor, 0))

/** Negative when more went out than came in, which the view says outright. */
const keptMinor = computed(() => incomeMinor - spentMinor.value)
const keptPercent = computed(() => share(Math.max(0, keptMinor.value), incomeMinor))
</script>

<template>
  <div class="flex flex-col gap-3">
    <ul class="flex flex-col gap-2">
      <li v-for="row in rows" :key="row.id ?? 'none'" class="flex flex-col gap-1">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-ink min-w-0 flex-1 truncate text-sm">
            {{ row.name ?? $t('transaction.uncategorised') }}
          </span>
          <span class="tnum text-ink-soft text-xs">{{ format(row.currentMinor) }}</span>
          <span class="tnum text-ink w-10 text-right text-sm font-semibold"
            >{{ row.percent }}%</span
          >
        </div>

        <div class="bg-muted h-1.5 w-full overflow-hidden rounded-full" aria-hidden="true">
          <div
            class="h-full rounded-full"
            :style="{
              width: `${Math.min(100, row.percent)}%`,
              backgroundColor: toneColor(row.tone),
            }"
          />
        </div>
      </li>
    </ul>

    <div class="border-hair flex items-baseline justify-between border-t pt-3">
      <span class="text-ink text-sm font-semibold">{{ $t('insights.kept') }}</span>

      <span v-if="keptMinor >= 0" class="flex items-baseline gap-2">
        <span class="tnum text-ink-soft text-xs">{{ format(keptMinor) }}</span>
        <span class="tnum text-positive text-sm font-bold">{{ keptPercent }}%</span>
      </span>

      <span v-else class="text-negative text-xs font-medium">{{ $t('insights.overspent') }}</span>
    </div>
  </div>
</template>
