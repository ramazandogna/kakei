<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { ChevronDown, Trash2 } from 'lucide-vue-next'

import { BaseButton, BaseInput, SegmentedControl, todayKey } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import CategoryPicker from '@/features/categories/components/CategoryPicker.vue'
import { minorDigits, parseAmount } from '@/shared/lib/money'
import { useMoney } from '@/features/profile/use-money'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from '../transactions.queries'
import { rememberCategory, readLastDirection, writeLastDirection } from '../recent'
import type { Direction, Necessity, Transaction } from '../transaction.types'

/**
 * The one screen the whole app is built around.
 *
 * The order of the fields is the design: direction, then amount, then
 * everything that can be filled in later. Only the amount is mandatory, so an
 * entry is possible in under five seconds standing at a till, and the Ledger is
 * where the rest gets added.
 */
const { transaction } = defineProps<{ transaction?: Transaction }>()

const emit = defineEmits<{ saved: []; deleted: [] }>()

const { t } = useI18n()
const { currency } = useMoney()

const create = useCreateTransaction()
const update = useUpdateTransaction()
const remove = useDeleteTransaction()

const isEditing = computed(() => transaction !== undefined)

const direction = ref<Direction>(
  transaction ? (transaction.direction as Direction) : readLastDirection(),
)
const amount = ref(transaction ? majorString(transaction.amount_minor) : '')
const categoryId = ref<string | null>(transaction?.category_id ?? null)
const necessity = ref<Necessity | null>((transaction?.necessity as Necessity | null) ?? null)
const occurredOn = ref(transaction?.occurred_on ?? todayKey())
const merchant = ref(transaction?.merchant ?? '')
const note = ref(transaction?.note ?? '')

const detailsOpen = ref(false)
const amountError = ref('')
const serverError = ref('')
const confirmingDelete = ref(false)

/** Minor units back to something typeable, for the edit case. */
function majorString(minor: number): string {
  const digits = minorDigits(currency.value)

  return digits === 0 ? String(minor) : (minor / 10 ** digits).toFixed(digits)
}

const DIRECTION_OPTIONS = computed(() => [
  { value: 'out' as Direction, label: t('direction.outLong') },
  { value: 'in' as Direction, label: t('direction.inLong') },
])

// Income is never a need or a want, so the mark disappears with the direction
// rather than being left set on a row that cannot show it.
watch(direction, (next) => {
  if (next === 'in') necessity.value = null
})

const amountInput = useTemplateRef<HTMLInputElement>('amountInput')

onMounted(() => {
  // BaseSheet focuses its own panel on the tick after it opens, so this waits
  // for the frame after that — otherwise the panel takes the focus straight
  // back and the keyboard never appears.
  requestAnimationFrame(() => amountInput.value?.focus())
})

const isSaving = computed(() => create.isPending.value || update.isPending.value)

function toggleNecessity(value: Necessity) {
  necessity.value = necessity.value === value ? null : value
}

async function submit() {
  serverError.value = ''

  const minor = parseAmount(amount.value, currency.value)

  if (minor === null) {
    amountError.value =
      amount.value.trim() === '' ? 'validation.amountRequired' : 'validation.amountInvalid'
    amountInput.value?.focus()
    return
  }

  amountError.value = ''

  const values = {
    direction: direction.value,
    amount_minor: minor,
    category_id: categoryId.value,
    necessity: direction.value === 'out' ? necessity.value : null,
    occurred_on: occurredOn.value,
    merchant: merchant.value.trim() || null,
    note: note.value.trim() || null,
  }

  try {
    if (transaction) {
      await update.mutateAsync({ id: transaction.id, patch: values })
    } else {
      await create.mutateAsync(values)
    }

    // Only after the write succeeds: a failed entry must not reorder the chips.
    writeLastDirection(direction.value)
    rememberCategory(direction.value, categoryId.value)

    emit('saved')
  } catch {
    serverError.value = 'transaction.saveFailed'
  }
}

async function confirmDelete() {
  if (!transaction) return

  serverError.value = ''

  try {
    await remove.mutateAsync(transaction.id)
    emit('deleted')
  } catch {
    serverError.value = 'transaction.saveFailed'
    confirmingDelete.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
    <SegmentedControl v-model="direction" :options="DIRECTION_OPTIONS" />

    <!-- Not BaseInput: this field is the reason the sheet exists, and it needs
         to be large enough to hit without looking and to read at arm's length. -->
    <div class="flex flex-col gap-1">
      <label class="text-ink-soft text-xs font-medium" for="amount-field">
        {{ $t('transaction.amount') }}
      </label>

      <input
        id="amount-field"
        ref="amountInput"
        v-model="amount"
        class="amount-field tnum"
        :class="direction === 'in' ? 'text-positive' : 'text-ink'"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        enterkeyhint="done"
        :aria-invalid="amountError !== ''"
        :aria-describedby="amountError ? 'amount-error' : undefined"
        placeholder="0"
      />

      <p v-if="amountError" id="amount-error" role="alert" class="text-negative text-xs">
        {{ $t(amountError) }}
      </p>
    </div>

    <section class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('transaction.category') }}</h3>
      <CategoryPicker v-model="categoryId" :direction="direction" />
    </section>

    <section v-if="direction === 'out'" class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('necessity.label') }}</h3>

      <div class="flex gap-2">
        <button
          type="button"
          class="necessity"
          :class="necessity === 'need' ? 'necessity-need' : 'necessity-off'"
          :aria-pressed="necessity === 'need'"
          @click="toggleNecessity('need')"
        >
          {{ $t('necessity.need') }}
        </button>

        <button
          type="button"
          class="necessity"
          :class="necessity === 'want' ? 'necessity-want' : 'necessity-off'"
          :aria-pressed="necessity === 'want'"
          @click="toggleNecessity('want')"
        >
          {{ $t('necessity.want') }}
        </button>
      </div>
    </section>

    <!-- Collapsed, because none of it is needed to record that money moved. -->
    <section class="flex flex-col gap-3">
      <button
        type="button"
        class="text-ink-soft hover:text-ink flex items-center gap-1 self-start text-xs font-medium transition-colors"
        :aria-expanded="detailsOpen"
        @click="detailsOpen = !detailsOpen"
      >
        <ChevronDown
          class="size-4 transition-transform"
          :class="{ 'rotate-180': detailsOpen }"
          aria-hidden="true"
        />
        {{ $t('transaction.details') }}
      </button>

      <div v-if="detailsOpen" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-ink-soft text-xs font-medium" for="date-field">
            {{ $t('transaction.date') }}
          </label>
          <input
            id="date-field"
            v-model="occurredOn"
            type="date"
            class="border-hair bg-surface text-ink rounded-card h-11 border px-3"
          />
        </div>

        <BaseInput
          v-model="merchant"
          :label="$t('transaction.merchant')"
          :placeholder="$t('transaction.merchantPlaceholder')"
        />

        <BaseInput
          v-model="note"
          :label="$t('transaction.note')"
          :placeholder="$t('transaction.notePlaceholder')"
        />
      </div>
    </section>

    <p v-if="serverError" role="alert" class="text-negative text-sm">{{ $t(serverError) }}</p>

    <BaseButton type="submit" :loading="isSaving">
      {{ isSaving ? $t('common.saving') : $t('common.save') }}
    </BaseButton>

    <!-- Editing only, and behind a second tap. Inline rather than a second
         sheet: a sheet on top of a sheet shares one focus trap, and closing the
         inner one releases the outer one's. -->
    <div v-if="isEditing" class="border-hair flex flex-col gap-2 border-t pt-4">
      <template v-if="confirmingDelete">
        <p class="text-ink text-sm font-medium">{{ $t('transaction.deleteTitle') }}</p>
        <p class="text-ink-soft text-xs">{{ $t('transaction.deleteBody') }}</p>

        <div class="flex gap-2">
          <BaseButton
            variant="danger"
            size="sm"
            :loading="remove.isPending.value"
            @click="confirmDelete"
          >
            {{ $t('common.deletePermanently') }}
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="confirmingDelete = false">
            {{ $t('common.cancel') }}
          </BaseButton>
        </div>
      </template>

      <BaseButton
        v-else
        variant="ghost"
        size="sm"
        class="text-negative self-start"
        @click="confirmingDelete = true"
      >
        <Trash2 class="mr-1.5 inline size-4" aria-hidden="true" />
        {{ $t('common.delete') }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
@reference "@/assets/main.css";

.amount-field {
  @apply border-hair bg-surface rounded-card h-16 w-full border px-4 text-3xl font-semibold;
}

.amount-field::placeholder {
  @apply text-ink-soft/40;
}

.necessity {
  @apply flex-1 rounded-full border py-2.5 text-sm font-medium transition-colors;
}

.necessity-off {
  @apply border-hair bg-surface text-ink-soft hover:bg-muted;
}

.necessity-need {
  @apply border-positive bg-positive text-white;
}

.necessity-want {
  @apply border-warning bg-warning text-white;
}
</style>
