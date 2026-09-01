import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'

import {
  archiveCategory,
  createCategory,
  deleteCategory,
  listArchivedCategories,
  listCategories,
  reorderCategories,
  unarchiveCategory,
  updateCategory,
} from './categories.api'
import { categoryKeys } from './categories.keys'
import { toTree } from './category-tree'
import type { Category, CategoryPatch, Direction } from './category.types'
import { transactionKeys } from '@/features/transactions/transactions.keys'
import { reportKeys } from '@/features/reports/reports.keys'

/**
 * Vue bindings for the categories API.
 *
 * The API layer stays framework-free; this file is the only place that knows
 * about vue-query. Components read from here and never call the API directly.
 */

/** Every active category, both directions. */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list('all'),
    queryFn: listCategories,
    // Categories change on the order of once a month, and every screen in the
    // app reads them. Refetching on each tab change would be pure noise.
    staleTime: 5 * 60_000,
  })
}

/** The active categories of one direction, as parents with their children. */
export function useCategoryTree(direction: () => Direction) {
  const { data, isPending, isError } = useCategories()

  return {
    tree: computed(() => toTree(data.value ?? [], direction())),
    isPending,
    isError,
  }
}

/** Archived categories, most recently archived first. */
export function useArchivedCategories() {
  return useQuery({
    queryKey: categoryKeys.list('archived'),
    queryFn: listArchivedCategories,
  })
}

/**
 * Everything that has to change when a category does.
 *
 * A rename shows up in the ledger rows and in every report, both of which
 * carry the name they were fetched with — so the two neighbouring caches are
 * dropped alongside the list itself.
 */
function useCategoryInvalidation() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
    ])
}

/** Creates a category, then refreshes every list that could contain it. */
export function useCreateCategory() {
  const invalidate = useCategoryInvalidation()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: invalidate,
  })
}

/** Renames or re-tones a category. */
export function useUpdateCategory() {
  const invalidate = useCategoryInvalidation()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) => updateCategory(id, patch),
    onSuccess: invalidate,
  })
}

/** Archives a category so it drops out of the pickers. */
export function useArchiveCategory() {
  const invalidate = useCategoryInvalidation()

  return useMutation({
    mutationFn: archiveCategory,
    onSuccess: invalidate,
  })
}

/** Restores an archived category. */
export function useUnarchiveCategory() {
  const invalidate = useCategoryInvalidation()

  return useMutation({
    mutationFn: unarchiveCategory,
    onSuccess: invalidate,
  })
}

/** Permanently deletes a category, leaving its transactions uncategorised. */
export function useDeleteCategory() {
  const invalidate = useCategoryInvalidation()

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  })
}

/**
 * Reorders siblings, moving the row in the cache before the request finishes.
 *
 * The one place in this feature that writes optimistically: an arrow tap has to
 * move the row now, and waiting a round trip would make repeated taps fight
 * each other. The snapshot in `onMutate` is restored if the call fails.
 */
export function useReorderCategories() {
  const queryClient = useQueryClient()
  const listKey = categoryKeys.list('all')

  return useMutation({
    mutationFn: reorderCategories,
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Category[]>(listKey)

      if (previous) {
        const position = new Map(ids.map((id, index) => [id, index]))

        queryClient.setQueryData(
          listKey,
          previous.map((category) => {
            const next = position.get(category.id)

            return next === undefined ? category : { ...category, sort_order: next }
          }),
        )
      }

      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}
