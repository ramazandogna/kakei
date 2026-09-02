<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarClock, Check } from 'lucide-vue-next'

import { BaseButton, ToneDot, formatDate, fromDateKey } from 'rei-kit'

import { toneClasses } from '@/shared/lib/tones'
import { useCategories } from '@/features/categories/categories.queries'
import { useMoney } from '@/features/profile/use-money'
import { usePendingRecurring, usePostRecurring } from '../recurring.queries'
import type { Period } from '@/shared/lib/period'
import type { PendingRecurring } from '../recurring.types'

/**
 * The fixed entries this period is still missing.
 *
 * Salary, rent, the phone bill: the same amount every month, and the part of a
 * ledger people give up on typing. Nothing is posted automatically — a month
 * that went differently is still theirs — but it is one tap rather than five
 * trips through the add sheet.
 */
const { period } = defineProps<{ period: Period }>()

const { data: pending } = usePendingRecurring(() => period)
const { data: categories } = useCategories()
const post = usePostRecurring()
const { signed } = useMoney()

/** Unticked rows are skipped: a month without a bonus is a normal month. */
const skipped = ref(new Set<string>())

const entries = computed(() => pending.value ?? [])
const chosen = computed(() => entries.value.filter((entry) => !skipped.value.has(entry.id)))

function toggle(id: string) {
  const next = new Set(skipped.value)

  if (next.has(id)) next.delete(id)
  else next.add(id)

  skipped.value = next
}

function nameFor(entry: PendingRecurring): string {
  const category = (categories.value ?? []).find((row) => row.id === entry.category_id)

  return entry.merchant?.trim() || category?.name || ''
}

function toneFor(entry: PendingRecurring): string {
  const category = (categories.value ?? []).find((row) => row.id === entry.category_id)

  return toneClasses(category?.tone).fill
}

function dayFor(entry: PendingRecurring): string {
  return formatDate(fromDateKey(entry.due_on), { day: 'numeric', month: 'short' })
}

async function postAll() {
  if (chosen.value.length === 0) return

  await post.mutateAsync(chosen.value)
  skipped.value = new Set()
}
</script>

<template>
  <section v-if="entries.length > 0" class="card">
    <header class="flex items-start gap-2.5">
      <span
        class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl"
      >
        <CalendarClock class="size-[18px]" aria-hidden="true" />
      </span>

      <div class="min-w-0 flex-1">
        <h2 class="text-ink text-sm font-semibold">{{ $t('recurring.pendingTitle') }}</h2>
        <p class="text-ink-soft text-xs">
          {{ $t('recurring.pendingBody', { count: entries.length }) }}
        </p>
      </div>
    </header>

    <ul class="flex flex-col">
      <li v-for="entry in entries" :key="entry.id">
        <button
          type="button"
          class="row"
          :class="{ 'opacity-45': skipped.has(entry.id) }"
          :aria-pressed="!skipped.has(entry.id)"
          @click="toggle(entry.id)"
        >
          <span
            class="tick"
            :class="skipped.has(entry.id) ? 'border-hair' : 'border-primary bg-primary text-white'"
            aria-hidden="true"
          >
            <Check v-if="!skipped.has(entry.id)" class="size-3 stroke-[3]" />
          </span>

          <ToneDot :fill="toneFor(entry)" class="shrink-0" />

          <span class="min-w-0 flex-1 text-left">
            <span class="text-ink block truncate text-sm">
              {{ nameFor(entry) || $t('transaction.uncategorised') }}
            </span>
            <span class="text-ink-soft block text-xs">{{ dayFor(entry) }}</span>
          </span>

          <span
            class="tnum shrink-0 text-sm font-semibold"
            :class="entry.direction === 'in' ? 'text-positive' : 'text-ink'"
          >
            {{ signed(entry.amount_minor, entry.direction) }}
          </span>
        </button>
      </li>
    </ul>

    <BaseButton :disabled="chosen.length === 0" :loading="post.isPending.value" @click="postAll">
      {{ $t('recurring.addSelected', { count: chosen.length }) }}
    </BaseButton>
  </section>
</template>

<style scoped>
@reference "@/assets/main.css";

.card {
  @apply border-primary/25 bg-primary/5 rounded-card flex flex-col gap-3 border p-3.5;
}

.row {
  @apply hover:bg-surface/60 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 transition-all;
}

.tick {
  @apply flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors;
}
</style>
