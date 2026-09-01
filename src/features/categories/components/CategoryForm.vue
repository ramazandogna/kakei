<script setup lang="ts">
import { computed, ref } from 'vue'

import { BaseButton, BaseInput, ToneDot } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import { CATEGORY_TONES, toneClasses } from '@/shared/lib/tones'
import type { CategoryTone } from '@/shared/lib/tones'
import { useCategories, useCreateCategory, useUpdateCategory } from '../categories.queries'
import { toTree } from '../category-tree'
import type { Category, Direction } from '../category.types'

/**
 * Adding or renaming a category.
 *
 * The parent is a choice, not a hierarchy editor: two levels is the whole tree,
 * so a category is either a heading or sits under one, and nothing here can
 * produce a third level.
 */
const { category, direction } = defineProps<{
  /** Explicitly `| undefined`: with `exactOptionalPropertyTypes` a parent that
      binds a possibly-absent ref cannot satisfy a bare optional prop. */
  category?: Category | undefined
  /** Only used when creating; an existing category keeps its own direction. */
  direction: Direction
}>()

const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n()
const { data: categories } = useCategories()
const create = useCreateCategory()
const update = useUpdateCategory()

const name = ref(category?.name ?? '')
const parentId = ref<string | null>(category?.parent_id ?? null)
const tone = ref<CategoryTone>(
  (CATEGORY_TONES as readonly string[]).includes(category?.tone ?? '')
    ? (category?.tone as CategoryTone)
    : 'slate',
)

const error = ref('')

const ownDirection = computed<Direction>(() =>
  category ? (category.direction as Direction) : direction,
)

/**
 * Headings this category could sit under.
 *
 * A category with children of its own is not offered: moving it under another
 * heading would put its children on a third level.
 */
const parents = computed(() => {
  const tree = toTree(categories.value ?? [], ownDirection.value)
  const hasChildren = tree.some(
    (node) => node.category.id === category?.id && node.children.length > 0,
  )

  if (hasChildren) return []

  return tree.filter((node) => node.category.id !== category?.id).map((node) => node.category)
})

const isSaving = computed(() => create.isPending.value || update.isPending.value)

async function submit() {
  const trimmed = name.value.trim()

  if (trimmed === '') {
    error.value = t('validation.nameRequired')
    return
  }

  if (trimmed.length > 40) {
    error.value = t('validation.nameTooLong')
    return
  }

  error.value = ''

  const patch = { name: trimmed, parent_id: parentId.value, tone: tone.value }

  if (category) {
    await update.mutateAsync({ id: category.id, patch })
  } else {
    await create.mutateAsync({
      ...patch,
      direction: ownDirection.value,
      sort_order: (categories.value?.length ?? 0) + 1,
    })
  }

  emit('saved')
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
    <BaseInput
      v-model="name"
      :label="$t('category.name')"
      :placeholder="$t('category.namePlaceholder')"
      :error="error"
    />

    <section v-if="parents.length > 0" class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('category.parent') }}</h3>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="chip"
          :class="parentId === null ? 'chip-on' : 'chip-off'"
          :aria-pressed="parentId === null"
          @click="parentId = null"
        >
          {{ $t('category.noParent') }}
        </button>

        <button
          v-for="parent in parents"
          :key="parent.id"
          type="button"
          class="chip"
          :class="parentId === parent.id ? 'chip-on' : 'chip-off'"
          :aria-pressed="parentId === parent.id"
          @click="parentId = parent.id"
        >
          <ToneDot :fill="toneClasses(parent.tone).fill" />
          {{ parent.name }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-ink-soft text-xs font-medium">{{ $t('category.tone') }}</h3>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in CATEGORY_TONES"
          :key="option"
          type="button"
          class="tone-swatch"
          :class="[toneClasses(option).fill, { 'tone-on': tone === option }]"
          :aria-label="$t(`tone.${option}`)"
          :aria-pressed="tone === option"
          @click="tone = option"
        />
      </div>
    </section>

    <BaseButton type="submit" :loading="isSaving">
      {{ isSaving ? $t('common.saving') : $t('common.save') }}
    </BaseButton>
  </form>
</template>

<style scoped>
@reference "@/assets/main.css";

.chip {
  @apply flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors;
}

.chip-on {
  @apply border-primary bg-primary text-white;
}

.chip-off {
  @apply border-hair bg-surface text-ink hover:bg-muted;
}

.tone-swatch {
  @apply size-8 rounded-full transition-transform;
}

.tone-on {
  @apply ring-ink scale-110 ring-2 ring-offset-2;
  --tw-ring-offset-color: var(--color-surface);
}
</style>
