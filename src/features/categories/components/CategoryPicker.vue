<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Plus, Search } from 'lucide-vue-next'

import { BaseButton, BaseInput, ToneDot, tapFeedback } from 'rei-kit'
import { toneClasses } from '@/shared/lib/tones'
import { readRecentCategories } from '@/features/transactions/recent'
import { foldForSearch } from '../search'
import { useCategories, useCreateCategory, useCategoryTree } from '../categories.queries'
import type { Category, Direction } from '../category.types'

/**
 * Picking where the money went, in one gesture where possible.
 *
 * Three ways in, in the order they are quickest. Recent categories are chips,
 * because the same handful account for most entries. Typing narrows everything
 * at once — one letter is usually enough, and a match under a collapsed heading
 * still surfaces. The tree is the complete list for when neither helps.
 *
 * Adding a category is inline: a trip to Settings mid-entry is how an entry
 * stops taking five seconds.
 */
const { direction } = defineProps<{ direction: Direction }>()

const selected = defineModel<string | null>({ required: true })

const { data: categories } = useCategories()
const { tree } = useCategoryTree(() => direction)
const create = useCreateCategory()

const byId = computed(() => new Map((categories.value ?? []).map((row) => [row.id, row])))

/**
 * The chips: recently used first, then the top of the tree to fill the row.
 *
 * A recent id whose category has since been archived or deleted is dropped
 * rather than rendered as a blank chip.
 */
const chips = computed<Category[]>(() => {
  const recent = readRecentCategories(direction)
    .map((id) => byId.value.get(id))
    .filter((category): category is Category => category?.direction === direction)

  const seen = new Set(recent.map((category) => category.id))
  const filler: Category[] = []

  for (const node of tree.value) {
    const candidates = node.children.length > 0 ? node.children : [node.category]

    for (const candidate of candidates) {
      if (recent.length + filler.length >= 6) break
      if (seen.has(candidate.id)) continue

      seen.add(candidate.id)
      filler.push(candidate)
    }
  }

  return [...recent, ...filler].slice(0, 6)
})

/** What the user is typing to narrow the list. */
const search = ref('')

const query = computed(() => foldForSearch(search.value.trim()))

/** Matching categories across the whole tree, parents and children alike. */
const matches = computed<Category[]>(() => {
  if (query.value === '') return []

  const found: Category[] = []

  for (const node of tree.value) {
    if (foldForSearch(node.category.name).includes(query.value)) found.push(node.category)

    for (const child of node.children) {
      if (foldForSearch(child.name).includes(query.value)) found.push(child)
    }
  }

  return found
})

/**
 * The tree, narrowed to what the search found.
 *
 * A heading is kept when it matches itself or when any of its children do, so
 * typing "kon" leaves Food on screen with Konbini under it rather than an
 * orphaned row with no context.
 */
const visibleTree = computed(() => {
  if (query.value === '') return tree.value

  return tree.value
    .map((node) => {
      const headingMatches = foldForSearch(node.category.name).includes(query.value)
      const children = node.children.filter((child) =>
        foldForSearch(child.name).includes(query.value),
      )

      return headingMatches ? node : { ...node, children }
    })
    .filter(
      (node) => foldForSearch(node.category.name).includes(query.value) || node.children.length > 0,
    )
})

function select(id: string | null) {
  tapFeedback()
  selected.value = id
  // The list has done its job; leaving the query up would hide everything else
  // if the user changes their mind.
  search.value = ''
}

/** Enter picks the single remaining match — the fast path for a typed search. */
function selectFirstMatch() {
  const only = matches.value[0]
  if (only) select(only.id)
}

/** Inline creation. Collapsed until asked for, so it never crowds the chips. */
const adding = ref(false)
const newName = ref('')
const nameError = ref('')

async function addCategory() {
  const name = (newName.value || search.value).trim()

  if (name === '') {
    nameError.value = 'validation.nameRequired'
    return
  }

  if (name.length > 40) {
    nameError.value = 'validation.nameTooLong'
    return
  }

  nameError.value = ''

  const category = await create.mutateAsync({
    name,
    direction,
    tone: 'slate',
    // After everything the seed inserted, so a new category lands at the end
    // rather than in the middle of a list the user already knows.
    sort_order: (categories.value?.length ?? 0) + 1,
  })

  selected.value = category.id
  newName.value = ''
  search.value = ''
  adding.value = false
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Above the chips, because typing is the fastest route once the list is
         longer than the six that fit on a row. -->
    <div class="search-field">
      <Search class="text-ink-soft size-4 shrink-0" aria-hidden="true" />
      <input
        v-model="search"
        type="search"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none"
        :placeholder="$t('category.searchPlaceholder')"
        :aria-label="$t('category.searchPlaceholder')"
        autocomplete="off"
        enterkeyhint="done"
        @keydown.enter.prevent="selectFirstMatch"
      />
    </div>

    <!-- What the search found, flat: under a search the tree's shape is noise,
         and the answer is usually the first row. -->
    <div v-if="query" class="flex flex-wrap gap-1.5">
      <button
        v-for="match in matches"
        :key="match.id"
        type="button"
        class="chip"
        :class="selected === match.id ? 'chip-on' : 'chip-off'"
        :aria-pressed="selected === match.id"
        @click="select(match.id)"
      >
        <ToneDot :fill="toneClasses(match.tone).fill" />
        {{ match.name }}
      </button>

      <button v-if="matches.length === 0" type="button" class="chip chip-off" @click="addCategory">
        <Plus class="size-3.5" aria-hidden="true" />
        {{ $t('category.createNamed', { name: search.trim() }) }}
      </button>
    </div>

    <div v-else class="flex flex-wrap gap-1.5">
      <button
        v-for="category in chips"
        :key="category.id"
        type="button"
        class="chip"
        :class="selected === category.id ? 'chip-on' : 'chip-off'"
        :aria-pressed="selected === category.id"
        @click="select(category.id)"
      >
        <ToneDot :fill="toneClasses(category.tone).fill" />
        {{ category.name }}
      </button>

      <button type="button" class="chip chip-off" :aria-expanded="adding" @click="adding = !adding">
        <Plus class="size-3.5" aria-hidden="true" />
        {{ $t('common.add') }}
      </button>
    </div>

    <div v-if="adding" class="flex items-end gap-2">
      <div class="flex-1">
        <BaseInput
          v-model="newName"
          :label="$t('category.name')"
          :placeholder="$t('category.namePlaceholder')"
          :error="nameError ? $t(nameError) : ''"
          label-hidden
        />
      </div>

      <BaseButton size="sm" :loading="create.isPending.value" @click="addCategory">
        {{ $t('common.save') }}
      </BaseButton>
    </div>

    <!-- The full tree. Headings are pickable too: not every expense belongs
         under a child, and forcing one would invent detail nobody meant. -->
    <div class="border-hair max-h-56 overflow-y-auto rounded-xl border">
      <ul class="divide-hair divide-y">
        <li v-for="node in visibleTree" :key="node.category.id">
          <button
            type="button"
            class="tree-row font-medium"
            :class="{ 'tree-row-on': selected === node.category.id }"
            :aria-pressed="selected === node.category.id"
            @click="select(node.category.id)"
          >
            <ToneDot :fill="toneClasses(node.category.tone).fill" />
            <span class="flex-1 text-left">{{ node.category.name }}</span>
            <Check
              v-if="selected === node.category.id"
              class="text-primary size-4"
              aria-hidden="true"
            />
          </button>

          <button
            v-for="child in node.children"
            :key="child.id"
            type="button"
            class="tree-row pl-9 text-sm"
            :class="{ 'tree-row-on': selected === child.id }"
            :aria-pressed="selected === child.id"
            @click="select(child.id)"
          >
            <span class="flex-1 text-left">{{ child.name }}</span>
            <Check v-if="selected === child.id" class="text-primary size-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>

    <button
      v-if="selected !== null"
      type="button"
      class="text-ink-soft hover:text-ink self-start text-xs underline"
      @click="select(null)"
    >
      {{ $t('transaction.noCategory') }}
    </button>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.search-field {
  @apply border-hair bg-surface focus-within:border-primary flex h-11 items-center gap-2 rounded-full border px-3.5 transition-colors;
}

/* Safari draws its own clear button, which lands on top of the border. */
.search-field input::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.chip {
  @apply flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors;
}

.chip-on {
  @apply border-primary bg-primary text-white;
}

.chip-off {
  @apply border-hair bg-surface text-ink hover:bg-muted;
}

.tree-row {
  @apply hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2.5 transition-colors;
}

.tree-row-on {
  @apply bg-muted;
}
</style>
