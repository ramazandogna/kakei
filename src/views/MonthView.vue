<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PiggyBank } from 'lucide-vue-next'

import { BaseSheet, EmptyState, SectionHeading, SkeletonList, useToday } from 'rei-kit'

import CategoryDonut from '@/features/reports/components/CategoryDonut.vue'
import MoversList from '@/features/reports/components/MoversList.vue'
import PeriodHeader from '@/features/reports/components/PeriodHeader.vue'
import PendingRecurringCard from '@/features/recurring/components/PendingRecurringCard.vue'
import TransactionForm from '@/features/transactions/components/TransactionForm.vue'
import TransactionRow from '@/features/transactions/components/TransactionRow.vue'
import { movers, rollUp, totalFor } from '@/features/reports/roll-up'
import { useCategoryReport } from '@/features/reports/reports.queries'
import { useTransactionsBetween } from '@/features/transactions/transactions.queries'
import { useMoney } from '@/features/profile/use-money'
import { useMonthStartDay } from '@/features/profile/profile.queries'
import {
  isCurrentPeriod,
  isDateKey,
  periodFor,
  previousPeriod,
  shiftPeriod,
} from '@/shared/lib/period'
import { toQuery } from '@/features/transactions/ledger-filters'
import type { Transaction } from '@/features/transactions/transaction.types'
import type { Period } from '@/shared/lib/period'

/**
 * The monthly reckoning: in, out, net, where it went, and how that compares.
 *
 * One round trip for the report and one for the latest entries. Everything on
 * this screen is derived from those two.
 */
const route = useRoute()
const router = useRouter()
const today = useToday()
const startDay = useMonthStartDay()
const { format, signed } = useMoney()

/**
 * Which period is on screen, held in the URL rather than in a ref.
 *
 * That is what lets a bar on Insights link straight to its month, and what
 * keeps the period through a reload. Anything unrecognised falls back to today,
 * because the query string is untrusted input.
 */
const anchor = computed(() => {
  const raw = route.query['period']
  const value = Array.isArray(raw) ? raw[0] : raw

  return typeof value === 'string' && isDateKey(value) ? value : today.value
})

const period = computed<Period>(() => periodFor(anchor.value, startDay.value))

const previous = computed(() => previousPeriod(period.value, startDay.value))

const report = useCategoryReport(period, previous)
const recent = useTransactionsBetween(
  () => period.value.start,
  () => period.value.end,
)

const rows = computed(() => report.data.value ?? [])

const inMinor = computed(() => totalFor(rows.value, 'in'))
const outMinor = computed(() => totalFor(rows.value, 'out'))
const netMinor = computed(() => inMinor.value - outMinor.value)

const spending = computed(() => rollUp(rows.value, 'out'))
const topMovers = computed(() => movers(spending.value, 4))

const latest = computed(() => (recent.data.value ?? []).slice(0, 5))

/** Expenses this period with no need/want mark, so the review can say so. */
const unmarked = computed(
  () =>
    (recent.data.value ?? []).filter((row) => row.direction === 'out' && row.necessity === null)
      .length,
)

const isEmpty = computed(() => inMinor.value === 0 && outMinor.value === 0)

const canStepForward = computed(() => !isCurrentPeriod(period.value, today.value))

/** Steps the period by replacing the query, so Back leaves the screen. */
function step(months: number) {
  const next = shiftPeriod(period.value, months, startDay.value)

  void router.replace({ query: { ...route.query, period: next.start } })
}

const editing = ref<Transaction | undefined>(undefined)
const editOpen = ref(false)

function openEdit(transaction: Transaction) {
  editing.value = transaction
  editOpen.value = true
}

/** Tapping a slice opens the Ledger already filtered to it and to this period. */
function openLedger(categoryId: string | null) {
  void router.push({
    name: 'LedgerView',
    query: toQuery({
      direction: 'out',
      from: period.value.start,
      to: period.value.end,
      ...(categoryId ? { categoryIds: [categoryId] } : {}),
    }),
  })
}

function openLedgerForPeriod() {
  void router.push({
    name: 'LedgerView',
    query: toQuery({ from: period.value.start, to: period.value.end }),
  })
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <PeriodHeader :period="period" :can-step-forward="canStepForward" @step="step" />

    <!-- Above the figures, because posting these changes every one of them. -->
    <PendingRecurringCard :period="period" />

    <!-- Three figures. Net is the headline, so it gets the row to itself. -->
    <section class="border-hair bg-surface rounded-card flex flex-col gap-3 border p-4">
      <div class="flex items-center gap-4">
        <span class="flex flex-1 flex-col">
          <span class="text-ink-soft text-[11px] font-medium">{{ $t('month.in') }}</span>
          <span class="tnum text-positive text-sm font-semibold">{{ format(inMinor) }}</span>
        </span>

        <span class="bg-hair h-8 w-px" aria-hidden="true" />

        <span class="flex flex-1 flex-col">
          <span class="text-ink-soft text-[11px] font-medium">{{ $t('month.out') }}</span>
          <span class="tnum text-ink text-sm font-semibold">{{ format(outMinor) }}</span>
        </span>
      </div>

      <div class="border-hair flex items-baseline justify-between border-t pt-3">
        <span class="text-ink-soft text-xs font-medium">{{ $t('month.net') }}</span>
        <span
          class="tnum text-2xl font-bold"
          :class="netMinor < 0 ? 'text-negative' : 'text-positive'"
        >
          {{ signed(Math.abs(netMinor), netMinor < 0 ? 'out' : 'in') }}
        </span>
      </div>
    </section>

    <SkeletonList v-if="report.isPending.value" :rows="4" :label="$t('common.loading')" />

    <EmptyState v-else-if="isEmpty" :title="$t('month.empty')" :description="$t('month.emptyBody')">
      <template #icon><PiggyBank class="mx-auto size-6" /></template>
    </EmptyState>

    <template v-else>
      <p
        v-if="unmarked > 0"
        class="bg-warning/10 text-warning rounded-card px-3 py-2 text-xs font-medium"
        role="status"
      >
        {{ $t('month.unmarked', { count: unmarked }) }}
      </p>

      <section v-if="spending.length > 0" class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 class="text-ink text-sm font-semibold">{{ $t('month.byCategory') }}</h2>
          <p class="text-ink-soft text-xs">{{ $t('month.byCategoryBody') }}</p>
        </div>

        <CategoryDonut :slices="spending" :total="outMinor" @select="openLedger">
          <template #amount="{ slice }">{{ format(slice.currentMinor) }}</template>
        </CategoryDonut>
      </section>

      <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 class="text-ink text-sm font-semibold">{{ $t('month.againstLast') }}</h2>
          <p class="text-ink-soft text-xs">{{ $t('month.againstLastBody') }}</p>
        </div>

        <MoversList v-if="topMovers.length > 0" :movers="topMovers" @select="openLedger" />

        <p v-else class="text-ink-soft rounded-card bg-muted/60 px-3 py-3 text-xs">
          {{ $t('month.steadyBody') }}
        </p>
      </section>

      <section v-if="latest.length > 0" class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between">
          <SectionHeading
            :tone="{ fill: 'bg-primary', card: '', text: 'text-primary' }"
            :label="$t('month.recent')"
          />

          <button
            type="button"
            class="text-primary text-xs font-medium"
            @click="openLedgerForPeriod"
          >
            {{ $t('month.seeAll') }}
          </button>
        </div>

        <div class="border-hair bg-surface rounded-card flex flex-col border p-1">
          <TransactionRow
            v-for="transaction in latest"
            :key="transaction.id"
            :transaction="transaction"
            @edit="openEdit"
          />
        </div>
      </section>
    </template>

    <BaseSheet
      v-model="editOpen"
      :title="$t('transaction.edit')"
      :subtitle="$t('transaction.editSubtitle')"
      :close-label="$t('common.close')"
    >
      <TransactionForm
        v-if="editing"
        :key="editing.id"
        :transaction="editing"
        @saved="editOpen = false"
        @deleted="editOpen = false"
      />
    </BaseSheet>
  </div>
</template>
