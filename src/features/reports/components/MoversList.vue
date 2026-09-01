<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-vue-next'

import { ToneDot } from 'rei-kit'
import { toneClasses } from '@/shared/lib/tones'
import { useMoney } from '@/features/profile/use-money'
import type { CategoryMover } from '../report.types'

/**
 * Against last month — the screen's reason to exist.
 *
 * Each row reads as a sentence: `konbini · ¥10,000 → ¥8,000 · 20% less`. Both
 * numbers stay on screen because the direction of travel means nothing without
 * where it travelled from.
 */
defineProps<{ movers: CategoryMover[] }>()

const emit = defineEmits<{ select: [id: string | null] }>()

const { format } = useMoney()
</script>

<template>
  <ul class="flex flex-col gap-1">
    <li v-for="mover in movers" :key="mover.id ?? 'none'">
      <button type="button" class="mover" @click="emit('select', mover.id)">
        <ToneDot :fill="toneClasses(mover.tone).fill" class="shrink-0" />

        <span class="min-w-0 flex-1 text-left">
          <span class="text-ink block truncate text-sm font-medium">
            {{ mover.name ?? $t('transaction.uncategorised') }}
          </span>
          <span class="tnum text-ink-soft block text-xs">
            {{ format(mover.previousMinor) }} → {{ format(mover.currentMinor) }}
          </span>
        </span>

        <!-- Spending less is the good outcome, so a fall is positive here even
             though the number went down. -->
        <span
          class="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
          :class="
            mover.deltaMinor > 0 ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'
          "
        >
          <component
            :is="mover.deltaMinor > 0 ? ArrowUpRight : ArrowDownRight"
            class="size-3.5"
            aria-hidden="true"
          />

          <template v-if="mover.deltaPercent === null">
            <Sparkles class="size-3" aria-hidden="true" />
            {{ $t('month.appeared') }}
          </template>
          <template v-else-if="mover.currentMinor === 0">
            {{ $t('month.disappeared') }}
          </template>
          <template v-else>
            {{
              mover.deltaPercent > 0
                ? $t('month.more', { percent: mover.deltaPercent })
                : $t('month.less', { percent: Math.abs(mover.deltaPercent) })
            }}
          </template>
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
@reference "@/assets/main.css";

.mover {
  @apply border-hair bg-surface rounded-card hover:bg-muted/40 flex w-full items-center gap-2.5 border px-3 py-2.5 transition-colors;
}
</style>
