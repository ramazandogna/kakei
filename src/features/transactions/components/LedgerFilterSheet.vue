<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { BaseButton, BaseInput, SegmentedControl, ToneDot } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import { toneClasses } from '@/shared/lib/tones'
import { useCategories } from '@/features/categories/categories.queries'
import { toTree } from '@/features/categories/category-tree'
import type { Direction } from '@/features/categories/category.types'
import type { Necessity, TransactionFilters } from '../transaction.types'

/**
 * The filter sheet.
 *
 * Edits a copy and only hands it back on Apply: changing a filter live would
 * fire a query on every tap, and the sheet is where someone assembles a
 * question rather than asks four of them.
 *
 * Picking a heading selects its children too, so "Food" means what a person
 * means by it rather than only the entries filed directly on the heading.
 */
const { filters } = defineProps<{ filters: TransactionFilters }>()

const emit = defineEmits<{ apply: [filters: TransactionFilters]; clear: [] }>()

const { t } = useI18n()
const { data: categories } = useCategories()

const draft = ref<TransactionFilters>({ ...filters })

// The sheet is kept mounted between openings, so the draft has to be re-seeded
// whenever the applied filters change underneath it.
watch(
  () => filters,
  (next) => {
    draft.value = { ...next }
  },
)

const DIRECTION_OPTIONS = computed(() => [
  { value: 'any', label: t('ledger.anyDirection') },
  { value: 'out', label: t('direction.out') },
  { value: 'in', label: t('direction.in') },
])

const NECESSITY_OPTIONS = computed(() => [
  { value: 'any', label: t('ledger.anyNecessity') },
  { value: 'need', label: t('necessity.need') },
  { value: 'want', label: t('necessity.want') },
])

const directionModel = computed<string>({
  get: () => draft.value.direction ?? 'any',
  set: (next) => {
    if (next === 'in' || next === 'out') draft.value.direction = next
    else delete draft.value.direction

    // A category belongs to one side of the ledger, so a selection made under
    // the other direction would silently match nothing.
    delete draft.value.categoryIds
  },
})

const necessityModel = computed<string>({
  get: () => draft.value.necessity ?? 'any',
  set: (next) => {
    if (next === 'need' || next === 'want') draft.value.necessity = next as Necessity
    else delete draft.value.necessity
  },
})

const searchModel = computed<string>({
  get: () => draft.value.search ?? '',
  set: (next) => {
    if (next.trim()) draft.value.search = next
    else delete draft.value.search
  },
})

const fromModel = computed<string>({
  get: () => draft.value.from ?? '',
  set: (next) => {
    if (next) draft.value.from = next
    else delete draft.value.from
  },
})

const toModel = computed<string>({
  get: () => draft.value.to ?? '',
  set: (next) => {
    if (next) draft.value.to = next
    else delete draft.value.to
  },
})

/** Only the direction being filtered, or both when it is not. */
const trees = computed(() => {
  const directions: Direction[] = draft.value.direction ? [draft.value.direction] : ['out', 'in']

  return directions.flatMap((direction) => toTree(categories.value ?? [], direction))
})

const selected = computed(() => new Set(draft.value.categoryIds ?? []))

/** A heading carries its children, because that is what picking one means. */
function idsFor(nodeId: string): string[] {
  const node = trees.value.find((candidate) => candidate.category.id === nodeId)
  if (!node) return [nodeId]

  return [node.category.id, ...node.children.map((child) => child.id)]
}

function toggle(id: string, withChildren: boolean) {
  const ids = withChildren ? idsFor(id) : [id]
  const next = new Set(draft.value.categoryIds ?? [])

  if (ids.every((candidate) => next.has(candidate))) {
    for (const candidate of ids) next.delete(candidate)
  } else {
    for (const candidate of ids) next.add(candidate)
  }

  if (next.size > 0) draft.value.categoryIds = [...next]
  else delete draft.value.categoryIds
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('transaction.category') }}</h3>
      <SegmentedControl v-model="directionModel" :options="DIRECTION_OPTIONS" />
    </section>

    <section v-if="draft.direction !== 'in'" class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('necessity.label') }}</h3>
      <SegmentedControl v-model="necessityModel" :options="NECESSITY_OPTIONS" />
    </section>

    <BaseInput
      v-model="searchModel"
      :label="$t('ledger.search')"
      :placeholder="$t('ledger.searchPlaceholder')"
    />

    <section class="flex gap-3">
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-ink-soft text-xs font-medium" for="filter-from">
          {{ $t('ledger.dateFrom') }}
        </label>
        <input id="filter-from" v-model="fromModel" type="date" class="date-field" />
      </div>

      <div class="flex flex-1 flex-col gap-1">
        <label class="text-ink-soft text-xs font-medium" for="filter-to">
          {{ $t('ledger.dateTo') }}
        </label>
        <input id="filter-to" v-model="toModel" type="date" class="date-field" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('ledger.anyCategory') }}</h3>

      <div class="border-hair max-h-52 overflow-y-auto rounded-xl border">
        <ul class="divide-hair divide-y">
          <li v-for="node in trees" :key="node.category.id">
            <button
              type="button"
              class="tree-row font-medium"
              :class="{ 'tree-row-on': selected.has(node.category.id) }"
              :aria-pressed="selected.has(node.category.id)"
              @click="toggle(node.category.id, true)"
            >
              <ToneDot :fill="toneClasses(node.category.tone).fill" />
              <span class="flex-1 text-left">{{ node.category.name }}</span>
            </button>

            <button
              v-for="child in node.children"
              :key="child.id"
              type="button"
              class="tree-row pl-9 text-sm"
              :class="{ 'tree-row-on': selected.has(child.id) }"
              :aria-pressed="selected.has(child.id)"
              @click="toggle(child.id, false)"
            >
              <span class="flex-1 text-left">{{ child.name }}</span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <div class="flex gap-2">
      <BaseButton class="flex-1" @click="emit('apply', draft)">{{ $t('common.apply') }}</BaseButton>
      <BaseButton variant="ghost" @click="emit('clear')">{{
        $t('ledger.clearFilters')
      }}</BaseButton>
    </div>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.date-field {
  @apply border-hair bg-surface text-ink rounded-card h-11 w-full border px-3 text-sm;
}

.tree-row {
  @apply hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2.5 transition-colors;
}

.tree-row-on {
  @apply bg-muted;
}
</style>
