<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { BaseButton, BaseInput, SegmentedControl } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import CategoryPicker from '@/features/categories/components/CategoryPicker.vue'
import { minorDigits, parseAmount } from '@/shared/lib/money'
import { useMoney } from '@/features/profile/use-money'
import { useCreateRecurring, useUpdateRecurring } from '../recurring.queries'
import type { RecurringEntry } from '../recurring.types'
import type { Direction } from '@/features/categories/category.types'

/**
 * One fixed monthly entry.
 *
 * The same fields as the add sheet minus the date, which becomes "which day of
 * the month" — capped at 28 so the entry exists in February too.
 */
const { entry } = defineProps<{ entry?: RecurringEntry | undefined }>()

const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { currency } = useMoney()

const create = useCreateRecurring()
const update = useUpdateRecurring()

const direction = ref<Direction>((entry?.direction as Direction) ?? 'out')
const amount = ref(entry ? majorString(entry.amount_minor) : '')
const categoryId = ref<string | null>(entry?.category_id ?? null)
const merchant = ref(entry?.merchant ?? '')
const dayOfMonth = ref(entry?.day_of_month ?? 1)
const amountError = ref('')

function majorString(minor: number): string {
  const digits = minorDigits(currency.value)

  return digits === 0 ? String(minor) : (minor / 10 ** digits).toFixed(digits)
}

const DIRECTION_OPTIONS = computed(() => [
  { value: 'out' as Direction, label: t('direction.outLong') },
  { value: 'in' as Direction, label: t('direction.inLong') },
])

/** Every day the shortest month has, so a template can never skip February. */
const DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => index + 1)

watch(direction, () => {
  categoryId.value = null
})

const isSaving = computed(() => create.isPending.value || update.isPending.value)

async function submit() {
  const minor = parseAmount(amount.value, currency.value)

  if (minor === null) {
    amountError.value =
      amount.value.trim() === '' ? 'validation.amountRequired' : 'validation.amountInvalid'
    return
  }

  amountError.value = ''

  const values = {
    direction: direction.value,
    amount_minor: minor,
    category_id: categoryId.value,
    merchant: merchant.value.trim() || null,
    day_of_month: dayOfMonth.value,
  }

  if (entry) await update.mutateAsync({ id: entry.id, patch: values })
  else await create.mutateAsync(values)

  emit('saved')
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
    <SegmentedControl v-model="direction" :options="DIRECTION_OPTIONS" />

    <BaseInput
      v-model="amount"
      :label="$t('transaction.amount')"
      :error="amountError ? $t(amountError) : ''"
      inputmode="decimal"
    />

    <BaseInput
      v-model="merchant"
      :label="$t('transaction.merchant')"
      :placeholder="$t('transaction.merchantPlaceholder')"
    />

    <div class="flex flex-col gap-1">
      <label class="text-ink-soft text-xs font-medium" for="recurring-day">
        {{ $t('recurring.day') }}
      </label>
      <select
        id="recurring-day"
        v-model.number="dayOfMonth"
        class="border-hair bg-surface text-ink rounded-card h-11 border px-3 text-sm"
      >
        <option v-for="day in DAY_OPTIONS" :key="day" :value="day">
          {{ $t('recurring.everyMonthOn', { day }) }}
        </option>
      </select>
      <p class="text-ink-soft text-xs">{{ $t('recurring.dayHint') }}</p>
    </div>

    <section class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('transaction.category') }}</h3>
      <CategoryPicker v-model="categoryId" :direction="direction" />
    </section>

    <BaseButton type="submit" :loading="isSaving">
      {{ isSaving ? $t('common.saving') : $t('common.save') }}
    </BaseButton>
  </form>
</template>
