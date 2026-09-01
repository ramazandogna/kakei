<script setup lang="ts">
import { computed } from 'vue'

import { ToneDot } from 'rei-kit'
import { toneClasses } from '@/shared/lib/tones'
import { useMoney } from '@/features/profile/use-money'
import { useCategories } from '@/features/categories/categories.queries'
import type { Transaction } from '../transaction.types'

/**
 * One line of the ledger.
 *
 * The amount is the only thing that has to be readable at a glance, so it holds
 * the right edge in tabular figures and everything else gives way to it.
 */
const { transaction } = defineProps<{ transaction: Transaction }>()

defineEmits<{ edit: [transaction: Transaction] }>()

const { signed } = useMoney()
const { data: categories } = useCategories()

const category = computed(() =>
  (categories.value ?? []).find((row) => row.id === transaction.category_id),
)

/** Merchant if there is one, then the note, then the category — never blank. */
const title = computed(
  () => transaction.merchant?.trim() || transaction.note?.trim() || category.value?.name || '',
)

/** The second line only appears when it would say something the first did not. */
const subtitle = computed(() => {
  const name = category.value?.name
  if (!name) return ''

  return name === title.value ? '' : name
})
</script>

<template>
  <button type="button" class="row" @click="$emit('edit', transaction)">
    <ToneDot :fill="toneClasses(category?.tone).fill" class="mt-1.5 shrink-0" />

    <span class="min-w-0 flex-1 text-left">
      <span class="text-ink block truncate text-sm font-medium">
        {{ title || $t('transaction.uncategorised') }}
      </span>
      <span v-if="subtitle" class="text-ink-soft block truncate text-xs">{{ subtitle }}</span>
    </span>

    <span class="flex shrink-0 flex-col items-end gap-0.5">
      <span
        class="tnum text-sm font-semibold"
        :class="transaction.direction === 'in' ? 'text-positive' : 'text-ink'"
      >
        {{ signed(transaction.amount_minor, transaction.direction === 'in' ? 'in' : 'out') }}
      </span>

      <span
        v-if="transaction.necessity"
        class="rounded-full px-1.5 py-px text-[10px] font-medium"
        :class="
          transaction.necessity === 'need'
            ? 'bg-positive/10 text-positive'
            : 'bg-warning/10 text-warning'
        "
      >
        {{ transaction.necessity === 'need' ? $t('necessity.need') : $t('necessity.want') }}
      </span>
    </span>
  </button>
</template>

<style scoped>
@reference "@/assets/main.css";

.row {
  @apply hover:bg-muted/50 flex w-full items-start gap-2.5 rounded-xl px-2 py-2.5 transition-colors;
}
</style>
