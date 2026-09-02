<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pause, Pencil, Play, Plus } from 'lucide-vue-next'

import { BaseButton, BaseSheet, EmptyState, SkeletonList, ToneDot } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import { toneClasses } from '@/shared/lib/tones'
import { useCategories } from '@/features/categories/categories.queries'
import { useMoney } from '@/features/profile/use-money'
import RecurringForm from './RecurringForm.vue'
import {
  useArchiveRecurring,
  useRecurringEntries,
  useUnarchiveRecurring,
} from '../recurring.queries'
import type { RecurringEntry } from '../recurring.types'

/**
 * Setting up the entries that repeat.
 *
 * Paused rather than deleted, because a salary that stops for three months is
 * the same salary when it comes back — and the transactions it already posted
 * keep pointing at it either way.
 */
const { t } = useI18n()

const { data: entries, isPending } = useRecurringEntries()
const { data: categories } = useCategories()
const archive = useArchiveRecurring()
const unarchive = useUnarchiveRecurring()
const { signed } = useMoney()

const formOpen = ref(false)
const editing = ref<RecurringEntry | undefined>(undefined)

const active = computed(() => (entries.value ?? []).filter((entry) => !entry.archived_at))

function openNew() {
  editing.value = undefined
  formOpen.value = true
}

function openEdit(entry: RecurringEntry) {
  editing.value = entry
  formOpen.value = true
}

function nameFor(entry: RecurringEntry): string {
  const category = (categories.value ?? []).find((row) => row.id === entry.category_id)

  return entry.merchant?.trim() || category?.name || t('transaction.uncategorised')
}

function toneFor(entry: RecurringEntry): string {
  const category = (categories.value ?? []).find((row) => row.id === entry.category_id)

  return toneClasses(category?.tone).fill
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <SkeletonList v-if="isPending" :rows="2" :label="$t('common.loading')" />

    <EmptyState
      v-else-if="active.length === 0"
      :title="$t('recurring.empty')"
      :description="$t('recurring.emptyBody')"
    >
      <template #action>
        <BaseButton size="sm" @click="openNew">{{ $t('recurring.new') }}</BaseButton>
      </template>
    </EmptyState>

    <ul v-else class="border-hair bg-surface rounded-card divide-hair divide-y border">
      <li v-for="entry in active" :key="entry.id" class="flex items-center gap-2.5 px-3 py-2.5">
        <ToneDot :fill="toneFor(entry)" class="shrink-0" />

        <span class="min-w-0 flex-1">
          <span class="text-ink block truncate text-sm font-medium">{{ nameFor(entry) }}</span>
          <span class="text-ink-soft block text-xs">
            {{ $t('recurring.everyMonthOn', { day: entry.day_of_month }) }}
          </span>
        </span>

        <span
          class="tnum shrink-0 text-sm font-semibold"
          :class="entry.direction === 'in' ? 'text-positive' : 'text-ink'"
        >
          {{ signed(entry.amount_minor, entry.direction === 'in' ? 'in' : 'out') }}
        </span>

        <span class="flex shrink-0">
          <button
            type="button"
            class="icon-button"
            :aria-label="$t('common.edit')"
            @click="openEdit(entry)"
          >
            <Pencil class="size-4" />
          </button>
          <button
            type="button"
            class="icon-button"
            :aria-label="$t('recurring.pause')"
            @click="archive.mutate(entry.id)"
          >
            <Pause class="size-4" />
          </button>
        </span>
      </li>
    </ul>

    <BaseButton
      v-if="active.length > 0"
      variant="ghost"
      size="sm"
      class="self-start"
      @click="openNew"
    >
      <Plus class="mr-1.5 inline size-4" aria-hidden="true" />
      {{ $t('recurring.new') }}
    </BaseButton>

    <section v-if="(entries ?? []).some((entry) => entry.archived_at)" class="flex flex-col gap-2">
      <h3 class="text-ink-soft px-1 text-xs font-medium">{{ $t('recurring.paused') }}</h3>

      <ul class="border-hair bg-surface rounded-card divide-hair divide-y border">
        <li
          v-for="entry in (entries ?? []).filter((row) => row.archived_at)"
          :key="entry.id"
          class="flex items-center gap-2 px-3 py-2.5"
        >
          <span class="text-ink-soft min-w-0 flex-1 truncate text-sm">{{ nameFor(entry) }}</span>
          <button
            type="button"
            class="icon-button"
            :aria-label="$t('recurring.resume')"
            @click="unarchive.mutate(entry.id)"
          >
            <Play class="size-4" />
          </button>
        </li>
      </ul>
    </section>

    <BaseSheet
      v-model="formOpen"
      :title="editing ? $t('recurring.edit') : $t('recurring.new')"
      :subtitle="$t('recurring.newSubtitle')"
      :close-label="$t('common.close')"
    >
      <RecurringForm :key="editing?.id ?? 'new'" :entry="editing" @saved="formOpen = false" />
    </BaseSheet>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.icon-button {
  @apply text-ink-soft hover:bg-muted hover:text-ink flex size-8 items-center justify-center rounded-lg transition-colors active:scale-90;
}
</style>
