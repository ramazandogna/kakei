<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArchiveRestore, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-vue-next'

import { BaseButton, BaseSheet, EmptyState, SegmentedControl, SkeletonList, ToneDot } from 'rei-kit'
import { useI18n } from 'vue-i18n'

import { toneClasses } from '@/shared/lib/tones'
import CategoryForm from './CategoryForm.vue'
import {
  useArchiveCategory,
  useArchivedCategories,
  useCategories,
  useCategoryTree,
  useDeleteCategory,
  useReorderCategories,
  useUnarchiveCategory,
} from '../categories.queries'
import { countCategoryTransactions } from '../categories.api'
import type { Category, Direction } from '../category.types'

/**
 * Category management, in Settings.
 *
 * Archive is the reversible one and sits on the row; delete is behind a
 * confirmation that first goes and counts how much history is about to lose its
 * label. Re-ordering is arrows rather than drag: the list is short, and a drag
 * handle inside a scrolling settings page fights the page.
 */
const { t } = useI18n()

const direction = ref<Direction>('out')

const { isPending } = useCategories()
const { tree } = useCategoryTree(() => direction.value)
const { data: archived } = useArchivedCategories()

const archive = useArchiveCategory()
const unarchive = useUnarchiveCategory()
const remove = useDeleteCategory()
const reorder = useReorderCategories()

const DIRECTION_OPTIONS = computed(() => [
  { value: 'out' as Direction, label: t('direction.outLong') },
  { value: 'in' as Direction, label: t('direction.inLong') },
])

const formOpen = ref(false)
const editing = ref<Category | undefined>(undefined)

function openNew() {
  editing.value = undefined
  formOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  formOpen.value = true
}

/** Moving a heading reorders headings; moving a child reorders its siblings. */
function move(category: Category, delta: number) {
  const siblings =
    category.parent_id === null
      ? tree.value.map((node) => node.category)
      : (tree.value.find((node) => node.category.id === category.parent_id)?.children ?? [])

  const index = siblings.findIndex((sibling) => sibling.id === category.id)
  const target = index + delta

  if (index === -1 || target < 0 || target >= siblings.length) return

  const ids = siblings.map((sibling) => sibling.id)
  const [moved] = ids.splice(index, 1)
  if (moved) ids.splice(target, 0, moved)

  reorder.mutate(ids)
}

/** Delete asks first, and the question carries a real number. */
const deleting = ref<Category | undefined>(undefined)
const affected = ref<number | null>(null)
const deleteOpen = ref(false)

async function askDelete(category: Category) {
  deleting.value = category
  affected.value = null
  deleteOpen.value = true

  try {
    affected.value = await countCategoryTransactions(category.id)
  } catch {
    // The count is context, not the decision. A failure leaves it unshown
    // rather than blocking a delete the user has already asked for.
    affected.value = null
  }
}

async function confirmDelete() {
  const category = deleting.value
  if (!category) return

  await remove.mutateAsync(category.id)
  deleteOpen.value = false
  deleting.value = undefined
}

const archivedForDirection = computed(() =>
  (archived.value ?? []).filter((category) => category.direction === direction.value),
)

const showArchived = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4">
    <SegmentedControl v-model="direction" :options="DIRECTION_OPTIONS" />

    <SkeletonList v-if="isPending" :rows="4" :label="$t('common.loading')" />

    <EmptyState
      v-else-if="tree.length === 0"
      :title="$t('category.empty')"
      :description="$t('category.emptyBody')"
    >
      <template #action>
        <BaseButton size="sm" @click="openNew">{{ $t('category.new') }}</BaseButton>
      </template>
    </EmptyState>

    <ul v-else class="border-hair bg-surface rounded-card divide-hair divide-y border">
      <li v-for="node in tree" :key="node.category.id">
        <div class="manage-row">
          <ToneDot :fill="toneClasses(node.category.tone).fill" class="shrink-0" />
          <span class="text-ink min-w-0 flex-1 truncate text-sm font-medium">
            {{ node.category.name }}
          </span>

          <div class="flex shrink-0 items-center">
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.moveUp', { name: node.category.name })"
              @click="move(node.category, -1)"
            >
              <ChevronDown class="size-4 rotate-180" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.moveDown', { name: node.category.name })"
              @click="move(node.category, 1)"
            >
              <ChevronDown class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.edit')"
              @click="openEdit(node.category)"
            >
              <Pencil class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.archive')"
              @click="archive.mutate(node.category.id)"
            >
              <ArchiveRestore class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button hover:text-negative"
              :aria-label="$t('common.delete')"
              @click="askDelete(node.category)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div v-for="child in node.children" :key="child.id" class="manage-row pl-9">
          <span class="text-ink min-w-0 flex-1 truncate text-sm">{{ child.name }}</span>

          <div class="flex shrink-0 items-center">
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.moveUp', { name: child.name })"
              @click="move(child, -1)"
            >
              <ChevronDown class="size-4 rotate-180" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.moveDown', { name: child.name })"
              @click="move(child, 1)"
            >
              <ChevronDown class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.edit')"
              @click="openEdit(child)"
            >
              <Pencil class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="$t('common.archive')"
              @click="archive.mutate(child.id)"
            >
              <ArchiveRestore class="size-4" />
            </button>
            <button
              type="button"
              class="icon-button hover:text-negative"
              :aria-label="$t('common.delete')"
              @click="askDelete(child)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>
      </li>
    </ul>

    <BaseButton variant="ghost" size="sm" class="self-start" @click="openNew">
      <Plus class="mr-1.5 inline size-4" aria-hidden="true" />
      {{ $t('category.new') }}
    </BaseButton>

    <p class="text-ink-soft text-xs">{{ $t('category.archiveHint') }}</p>

    <section v-if="archivedForDirection.length > 0" class="flex flex-col gap-2">
      <button
        type="button"
        class="text-ink-soft hover:text-ink flex items-center gap-1 self-start text-xs font-medium transition-colors"
        :aria-expanded="showArchived"
        @click="showArchived = !showArchived"
      >
        <ChevronDown
          class="size-4 transition-transform"
          :class="{ 'rotate-180': showArchived }"
          aria-hidden="true"
        />
        {{ $t('category.archived') }} ({{ archivedForDirection.length }})
      </button>

      <p v-if="showArchived" class="text-ink-soft px-1 text-xs">
        {{ $t('category.archivedBody') }}
      </p>

      <ul
        v-if="showArchived"
        class="border-hair bg-surface rounded-card divide-hair divide-y border"
      >
        <li v-for="category in archivedForDirection" :key="category.id" class="manage-row">
          <span class="text-ink-soft min-w-0 flex-1 truncate text-sm">{{ category.name }}</span>
          <BaseButton variant="ghost" size="sm" @click="unarchive.mutate(category.id)">
            {{ $t('common.restore') }}
          </BaseButton>
        </li>
      </ul>
    </section>

    <BaseSheet
      v-model="formOpen"
      :title="editing ? $t('category.edit') : $t('category.new')"
      :subtitle="editing ? '' : $t('category.newSubtitle')"
      :close-label="$t('common.close')"
    >
      <CategoryForm
        :key="editing?.id ?? 'new'"
        :category="editing"
        :direction="direction"
        @saved="formOpen = false"
      />
    </BaseSheet>

    <BaseSheet
      v-model="deleteOpen"
      :title="$t('category.deleteTitle', { name: deleting?.name ?? '' })"
      :subtitle="$t('category.deleteBody')"
      :close-label="$t('common.close')"
    >
      <div class="flex flex-col gap-4">
        <p v-if="affected !== null && affected > 0" class="text-ink text-sm">
          {{ $t('category.deleteWithCount', { count: affected }) }}
        </p>

        <div class="flex gap-2">
          <BaseButton variant="danger" :loading="remove.isPending.value" @click="confirmDelete">
            {{ $t('common.deletePermanently') }}
          </BaseButton>
          <BaseButton variant="ghost" @click="deleteOpen = false">
            {{ $t('common.cancel') }}
          </BaseButton>
        </div>
      </div>
    </BaseSheet>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

.manage-row {
  @apply flex items-center gap-2 px-3 py-2.5;
}

.icon-button {
  @apply text-ink-soft hover:bg-muted hover:text-ink flex size-8 items-center justify-center rounded-lg transition-colors active:scale-90;
}
</style>
