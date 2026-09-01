<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-vue-next'

import { toneColor } from '@/shared/lib/tones'
import { useMoney } from '@/features/profile/use-money'
import type { CategorySlice } from '../report.types'

/**
 * One category, this period beside the last one.
 *
 * The same component for income and for spending: a side income that dried up
 * has to be as visible as a habit that got expensive, and nothing here cares
 * which direction the money went.
 */
const { slice } = defineProps<{ slice: CategorySlice }>()

const { format } = useMoney()

const deltaMinor = computed(() => slice.currentMinor - slice.previousMinor)

const deltaPercent = computed(() =>
  slice.previousMinor > 0 ? Math.round((deltaMinor.value / slice.previousMinor) * 100) : null,
)

/** Both columns share one scale, so the two bars are actually comparable. */
const peak = computed(() => Math.max(1, slice.currentMinor, slice.previousMinor))

const icon = computed(() => {
  if (deltaMinor.value === 0) return Minus

  return deltaMinor.value > 0 ? ArrowUpRight : ArrowDownRight
})
</script>

<template>
  <div class="border-hair bg-surface rounded-card flex flex-col gap-4 border p-4">
    <header class="flex items-center gap-2">
      <span
        class="size-3 shrink-0 rounded-full"
        :style="{ backgroundColor: toneColor(slice.tone) }"
        aria-hidden="true"
      />
      <h3 class="text-ink min-w-0 flex-1 truncate text-sm font-semibold">
        {{ slice.name ?? $t('transaction.uncategorised') }}
      </h3>

      <span
        class="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
        :class="
          deltaMinor === 0
            ? 'bg-muted text-ink-soft'
            : deltaMinor > 0
              ? 'bg-negative/10 text-negative'
              : 'bg-positive/10 text-positive'
        "
      >
        <component :is="icon" class="size-3.5" aria-hidden="true" />
        <template v-if="deltaPercent === null">{{ $t('month.appeared') }}</template>
        <template v-else-if="deltaPercent > 0">
          {{ $t('month.more', { percent: deltaPercent }) }}
        </template>
        <template v-else-if="deltaPercent < 0">
          {{ $t('month.less', { percent: Math.abs(deltaPercent) }) }}
        </template>
        <template v-else>{{ $t('month.steady') }}</template>
      </span>
    </header>

    <div class="flex items-end gap-4">
      <div class="flex flex-1 flex-col items-center gap-2">
        <div class="flex h-24 w-full items-end justify-center">
          <span
            class="bg-muted w-10 rounded-t-md"
            :style="{ height: `${Math.max(2, (slice.previousMinor / peak) * 100)}%` }"
            aria-hidden="true"
          />
        </div>
        <span class="text-ink-soft text-[11px]">{{ $t('insights.lastPeriod') }}</span>
        <span class="tnum text-ink-soft text-xs">{{ format(slice.previousMinor) }}</span>
      </div>

      <div class="flex flex-1 flex-col items-center gap-2">
        <div class="flex h-24 w-full items-end justify-center">
          <span
            class="w-10 rounded-t-md"
            :style="{
              height: `${Math.max(2, (slice.currentMinor / peak) * 100)}%`,
              backgroundColor: toneColor(slice.tone),
            }"
            aria-hidden="true"
          />
        </div>
        <span class="text-ink text-[11px] font-medium">{{ $t('insights.thisPeriod') }}</span>
        <span class="tnum text-ink text-sm font-semibold">{{ format(slice.currentMinor) }}</span>
      </div>
    </div>

    <p class="text-ink-soft text-center text-xs">
      {{ format(slice.previousMinor) }} → {{ format(slice.currentMinor) }}
    </p>
  </div>
</template>
