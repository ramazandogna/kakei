<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ReceiptText, SlidersHorizontal } from 'lucide-vue-next'

import {
  BaseButton,
  BaseSheet,
  EmptyState,
  PageHeader,
  SkeletonList,
  relativeDayLabel,
  formatDate,
  fromDateKey,
  useToday,
} from 'rei-kit'
import { useI18n } from 'vue-i18n'

import LedgerFilterSheet from '@/features/transactions/components/LedgerFilterSheet.vue'
import TransactionForm from '@/features/transactions/components/TransactionForm.vue'
import TransactionRow from '@/features/transactions/components/TransactionRow.vue'
import { groupByDay, totals } from '@/features/transactions/group-by-day'
import { countActive, fromQuery, toQuery } from '@/features/transactions/ledger-filters'
import { useTransactions } from '@/features/transactions/transactions.queries'
import type { Transaction, TransactionFilters } from '@/features/transactions/transaction.types'
import { useMoney } from '@/features/profile/use-money'

/**
 * Every transaction, newest first, grouped by day with a per-day subtotal.
 *
 * The filters live in the URL rather than in this component, so a filtered view
 * can be linked, reloaded and stepped out of with the back button.
 */
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const today = useToday()
const { format, signed } = useMoney()

const filters = computed<TransactionFilters>(() => fromQuery(route.query))
const activeCount = computed(() => countActive(filters.value))

const query = useTransactions(filters)

const rows = computed(() => query.data.value?.pages.flatMap((page) => page.rows) ?? [])
const days = computed(() => groupByDay(rows.value))

/**
 * The header's running totals cover what has been loaded, not the whole
 * selection — so the number is honest about the page it is standing on rather
 * than needing a second aggregate query per keystroke.
 */
const loaded = computed(() => totals(rows.value))

const filterOpen = ref(false)
const editing = ref<Transaction | undefined>(undefined)
const editOpen = ref(false)

function applyFilters(next: TransactionFilters) {
  filterOpen.value = false
  void router.replace({ query: toQuery(next) })
}

function clearFilters() {
  filterOpen.value = false
  void router.replace({ query: {} })
}

function openEdit(transaction: Transaction) {
  editing.value = transaction
  editOpen.value = true
}

const DAY_LABELS = computed(() => ({ today: t('day.today'), yesterday: t('day.yesterday') }))

/** "Today", "Yesterday", then the weekday — and the full date underneath. */
function dayHeading(dateKey: string): string {
  return relativeDayLabel(dateKey, today.value, DAY_LABELS.value)
}

function dayDate(dateKey: string): string {
  return formatDate(fromDateKey(dateKey), { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <PageHeader :title="$t('ledger.title')">
      <template #right>
        <button
          type="button"
          class="filter-button"
          :class="activeCount > 0 ? 'filter-on' : 'filter-off'"
          :aria-label="
            activeCount > 0
              ? $t('ledger.activeFilters', { count: activeCount })
              : $t('ledger.filters')
          "
          @click="filterOpen = true"
        >
          <SlidersHorizontal class="size-5" />
          <span v-if="activeCount > 0" class="filter-badge">{{ activeCount }}</span>
        </button>
      </template>
    </PageHeader>

    <!-- The running in/out for whatever the filters currently select. -->
    <section class="border-hair bg-surface rounded-card flex items-center gap-4 border px-4 py-3">
      <span class="flex flex-1 flex-col">
        <span class="text-ink-soft text-[11px] font-medium">{{ $t('month.in') }}</span>
        <span class="tnum text-positive text-sm font-semibold">{{ format(loaded.inMinor) }}</span>
      </span>

      <span class="bg-hair h-8 w-px" aria-hidden="true" />

      <span class="flex flex-1 flex-col">
        <span class="text-ink-soft text-[11px] font-medium">{{ $t('month.out') }}</span>
        <span class="tnum text-ink text-sm font-semibold">{{ format(loaded.outMinor) }}</span>
      </span>
    </section>

    <SkeletonList v-if="query.isPending.value" :rows="6" :label="$t('common.loading')" />

    <EmptyState
      v-else-if="days.length === 0"
      :title="activeCount > 0 ? $t('ledger.emptyFiltered') : $t('ledger.empty')"
      :description="activeCount > 0 ? $t('ledger.emptyFilteredBody') : $t('ledger.emptyBody')"
    >
      <template #icon><ReceiptText class="size-6" /></template>
      <template v-if="activeCount > 0" #action>
        <BaseButton variant="ghost" size="sm" @click="clearFilters">
          {{ $t('ledger.clearFilters') }}
        </BaseButton>
      </template>
    </EmptyState>

    <template v-else>
      <section v-for="day in days" :key="day.dateKey" class="flex flex-col gap-1">
        <header class="flex items-baseline justify-between px-2">
          <h2 class="text-ink text-xs font-semibold">
            {{ dayHeading(day.dateKey) }}
            <span class="text-ink-soft font-normal">· {{ dayDate(day.dateKey) }}</span>
          </h2>

          <span class="tnum text-ink-soft text-[11px]" :aria-label="$t('ledger.dayTotal')">
            <span v-if="day.inMinor > 0" class="text-positive">
              {{ signed(day.inMinor, 'in') }}
            </span>
            <span v-if="day.inMinor > 0 && day.outMinor > 0"> · </span>
            <span v-if="day.outMinor > 0">{{ signed(day.outMinor, 'out') }}</span>
          </span>
        </header>

        <div class="border-hair bg-surface rounded-card flex flex-col border p-1">
          <TransactionRow
            v-for="transaction in day.rows"
            :key="transaction.id"
            :transaction="transaction"
            @edit="openEdit"
          />
        </div>
      </section>

      <BaseButton
        v-if="query.hasNextPage.value"
        variant="ghost"
        :loading="query.isFetchingNextPage.value"
        @click="query.fetchNextPage()"
      >
        {{ $t('ledger.loadMore') }}
      </BaseButton>
    </template>

    <BaseSheet
      v-model="filterOpen"
      :title="$t('ledger.filters')"
      :subtitle="$t('ledger.filtersSubtitle')"
      :close-label="$t('common.close')"
    >
      <LedgerFilterSheet :filters="filters" @apply="applyFilters" @clear="clearFilters" />
    </BaseSheet>

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

<style scoped>
@reference "@/assets/main.css";

.filter-button {
  @apply relative flex size-10 items-center justify-center rounded-full transition-colors active:scale-90;
}

.filter-off {
  @apply text-ink-soft hover:text-ink hover:bg-muted;
}

.filter-on {
  @apply bg-primary/10 text-primary;
}

.filter-badge {
  @apply bg-primary absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white;
}
</style>
