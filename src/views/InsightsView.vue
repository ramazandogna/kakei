<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChartNoAxesColumn } from 'lucide-vue-next'

import { EmptyState, PageHeader, SegmentedControl, SkeletonList, ToneDot, useToday } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import CategoryDeepDive from '@/features/reports/components/CategoryDeepDive.vue'
import MonthlyBars from '@/features/reports/components/MonthlyBars.vue'
import ShareOfIncome from '@/features/reports/components/ShareOfIncome.vue'
import { rollUp, totalFor } from '@/features/reports/roll-up'
import { useCategoryReport, useMonthlyTotals } from '@/features/reports/reports.queries'
import { useMonthStartDay } from '@/features/profile/profile.queries'
import { lastPeriods, periodFor, previousPeriod } from '@/shared/lib/period'
import { toneClasses } from '@/shared/lib/tones'
import type { Direction } from '@/features/categories/category.types'

/**
 * The twelve-month view, the share of income, and any category against its own
 * last month.
 *
 * Two round trips: the same `category_report` the Month screen uses, and the
 * twelve-period series.
 */
const router = useRouter()
const today = useToday()
const startDay = useMonthStartDay()
const { t } = useI18n()

const period = computed(() => periodFor(today.value, startDay.value))
const previous = computed(() => previousPeriod(period.value, startDay.value))

const series = computed(() => lastPeriods(12, today.value, startDay.value))

const totals = useMonthlyTotals(
  () => series.value[0]?.start ?? period.value.start,
  () => period.value.end,
  startDay,
)

const report = useCategoryReport(period, previous)

const rows = computed(() => report.data.value ?? [])
const incomeMinor = computed(() => totalFor(rows.value, 'in'))

const spending = computed(() => rollUp(rows.value, 'out'))

/** The deep-dive works for income too, so the direction is a control. */
const direction = ref<Direction>('out')

const DIRECTION_OPTIONS = computed(() => [
  { value: 'out' as Direction, label: t('direction.outLong') },
  { value: 'in' as Direction, label: t('direction.inLong') },
])

const diveSlices = computed(() => rollUp(rows.value, direction.value))

const selectedId = ref<string | null | undefined>(undefined)

const selected = computed(() => {
  const slices = diveSlices.value

  if (selectedId.value === undefined) return slices[0]

  return slices.find((slice) => slice.id === selectedId.value) ?? slices[0]
})

const periodsWithMoney = computed(
  () => (totals.data.value ?? []).filter((row) => row.in_minor > 0 || row.out_minor > 0).length,
)

/** Tapping a bar takes the Month tab to that period. */
function openPeriod(periodStart: string) {
  void router.push({ name: 'MonthView', query: { period: periodStart } })
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <PageHeader :title="$t('insights.title')" />

    <SkeletonList v-if="totals.isPending.value" :rows="5" :label="$t('common.loading')" />

    <EmptyState
      v-else-if="periodsWithMoney === 0"
      :title="$t('insights.empty')"
      :description="$t('insights.emptyBody')"
    >
      <template #icon><ChartNoAxesColumn class="mx-auto size-6" /></template>
    </EmptyState>

    <template v-else>
      <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 class="text-ink text-sm font-semibold">{{ $t('insights.twelveMonths') }}</h2>
          <p class="text-ink-soft text-xs">{{ $t('insights.twelveMonthsBody') }}</p>
        </div>

        <MonthlyBars :periods="totals.data.value ?? []" @select="openPeriod" />
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 class="text-ink text-sm font-semibold">{{ $t('insights.shareOfIncome') }}</h2>
          <p class="text-ink-soft text-xs">{{ $t('insights.shareOfIncomeBody') }}</p>
        </div>

        <ShareOfIncome v-if="incomeMinor > 0" :slices="spending" :income-minor="incomeMinor" />

        <div v-else class="rounded-card bg-muted/60 px-3 py-3">
          <p class="text-ink text-xs font-medium">{{ $t('insights.noIncome') }}</p>
          <p class="text-ink-soft mt-0.5 text-xs">{{ $t('insights.noIncomeBody') }}</p>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 class="text-ink text-sm font-semibold">{{ $t('insights.deepDive') }}</h2>
          <p class="text-ink-soft text-xs">{{ $t('insights.deepDiveBody') }}</p>
        </div>

        <SegmentedControl v-model="direction" :options="DIRECTION_OPTIONS" />

        <div v-if="diveSlices.length > 0" class="flex flex-col gap-3">
          <div class="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button
              v-for="slice in diveSlices"
              :key="slice.id ?? 'none'"
              type="button"
              class="chip"
              :class="selected?.id === slice.id ? 'chip-on' : 'chip-off'"
              :aria-pressed="selected?.id === slice.id"
              @click="selectedId = slice.id"
            >
              <ToneDot :fill="toneClasses(slice.tone).fill" />
              {{ slice.name ?? $t('transaction.uncategorised') }}
            </button>
          </div>

          <CategoryDeepDive v-if="selected" :slice="selected" />
        </div>

        <p v-else class="text-ink-soft rounded-card bg-muted/60 px-3 py-3 text-xs">
          {{ $t('month.emptyBody') }}
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.chip {
  @apply flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors;
}

.chip-on {
  @apply border-primary bg-primary text-white;
}

.chip-off {
  @apply border-hair bg-surface text-ink hover:bg-muted;
}
</style>
