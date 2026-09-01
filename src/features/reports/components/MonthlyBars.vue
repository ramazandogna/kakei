<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { formatDate, fromDateKey, useDragScroll } from 'rei-kit'
import { useMoney } from '@/features/profile/use-money'
import type { MonthlyTotalRow } from '../report.types'

/**
 * Twelve periods as bars, in and out side by side.
 *
 * `<rect>`s, not a chart library: the drawing is two rectangles per period, and
 * the numbers below are the part anyone actually reads. The bars are buttons,
 * each carrying its own figures as an accessible name, so the chart is usable
 * without seeing it.
 */
const { periods } = defineProps<{ periods: MonthlyTotalRow[] }>()

const emit = defineEmits<{ select: [periodStart: string] }>()

const { format } = useMoney()

const scroller = useTemplateRef<HTMLElement>('scroller')
const { didDrag } = useDragScroll(scroller)

/**
 * Both directions share one scale, or "in" and "out" would be drawn in
 * different units and the comparison the chart exists for would be a lie.
 */
const peak = computed(() =>
  Math.max(1, ...periods.flatMap((period) => [period.in_minor, period.out_minor])),
)

const bars = computed(() =>
  periods.map((period) => ({
    ...period,
    label: formatDate(fromDateKey(period.period_start), { month: 'short' }),
    inHeight: Math.round((period.in_minor / peak.value) * 100),
    outHeight: Math.round((period.out_minor / peak.value) * 100),
  })),
)

/** A drag that scrolled the strip must not also count as a tap on a bar. */
function select(periodStart: string) {
  if (didDrag()) return

  emit('select', periodStart)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div ref="scroller" class="no-scrollbar overflow-x-auto">
      <ul class="flex min-w-full items-end gap-2 px-1">
        <li
          v-for="bar in bars"
          :key="bar.period_start"
          class="flex flex-1 flex-col items-center gap-1"
        >
          <button
            type="button"
            class="group flex h-28 w-full min-w-8 items-end justify-center gap-0.5"
            :aria-label="`${bar.label}: ${$t('month.in')} ${format(bar.in_minor)}, ${$t('month.out')} ${format(bar.out_minor)}`"
            @click="select(bar.period_start)"
          >
            <span
              class="bg-positive w-2 rounded-t-sm transition-opacity group-hover:opacity-80"
              :style="{ height: `${Math.max(bar.inHeight, bar.in_minor > 0 ? 2 : 0)}%` }"
              aria-hidden="true"
            />
            <span
              class="bg-negative w-2 rounded-t-sm transition-opacity group-hover:opacity-80"
              :style="{ height: `${Math.max(bar.outHeight, bar.out_minor > 0 ? 2 : 0)}%` }"
              aria-hidden="true"
            />
          </button>

          <span class="text-ink-soft text-[10px]">{{ bar.label }}</span>
        </li>
      </ul>
    </div>

    <!-- The numbers the drawing summarises. -->
    <table class="w-full text-left text-xs">
      <thead class="text-ink-soft">
        <tr>
          <th scope="col" class="py-1 font-medium">{{ $t('insights.twelveMonths') }}</th>
          <th scope="col" class="py-1 text-right font-medium">{{ $t('month.in') }}</th>
          <th scope="col" class="py-1 text-right font-medium">{{ $t('month.out') }}</th>
        </tr>
      </thead>
      <tbody class="divide-hair divide-y">
        <tr v-for="bar in bars" :key="bar.period_start">
          <th scope="row" class="text-ink py-1.5 font-normal">
            {{ formatDate(fromDateKey(bar.period_start), { month: 'short', year: 'numeric' }) }}
          </th>
          <td class="tnum text-positive py-1.5 text-right">{{ format(bar.in_minor) }}</td>
          <td class="tnum text-ink py-1.5 text-right">{{ format(bar.out_minor) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
