import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import {
  countTransactions,
  createTransaction,
  deleteTransaction,
  listTransactions,
  listTransactionsBetween,
  updateTransaction,
} from './transactions.api'
import { transactionKeys } from './transactions.keys'
import type { TransactionCursor, TransactionFilters, TransactionPatch } from './transaction.types'
import { reportKeys } from '@/features/reports/reports.keys'

/**
 * Vue bindings for the transactions API.
 *
 * The API layer stays framework-free; this file is the only place that knows
 * about vue-query.
 */

/**
 * The ledger, page by page.
 *
 * The filters are a getter rather than a value, so changing one swaps the query
 * key and vue-query starts a fresh list instead of appending pages of the old
 * selection to the new one.
 */
export function useTransactions(filters: MaybeRefOrGetter<TransactionFilters>) {
  return useInfiniteQuery({
    queryKey: computed(() => transactionKeys.list(toValue(filters))),
    queryFn: ({ pageParam }) =>
      listTransactions(toValue(filters), pageParam as TransactionCursor | null),
    initialPageParam: null as TransactionCursor | null,
    getNextPageParam: (last) => last.next,
  })
}

/** Every transaction in a period. One request; the Month screen groups it. */
export function useTransactionsBetween(
  from: MaybeRefOrGetter<string>,
  to: MaybeRefOrGetter<string>,
) {
  return useQuery({
    queryKey: computed(() => transactionKeys.recent(toValue(from), toValue(to))),
    queryFn: () => listTransactionsBetween(toValue(from), toValue(to)),
  })
}

/** How many transactions the account holds. */
export function useTransactionCount() {
  return useQuery({
    queryKey: transactionKeys.count(),
    queryFn: countTransactions,
  })
}

/**
 * Everything a write invalidates.
 *
 * A single transaction moves the ledger, every total on the Month screen and
 * every bar on Insights, so all three caches are dropped together rather than
 * one screen being left stale until it is next opened.
 */
function useTransactionInvalidation() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
    ])
}

/** Adds money to the ledger. */
export function useCreateTransaction() {
  const invalidate = useTransactionInvalidation()

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: invalidate,
  })
}

/** Edits a transaction from the ledger. */
export function useUpdateTransaction() {
  const invalidate = useTransactionInvalidation()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionPatch }) =>
      updateTransaction(id, patch),
    onSuccess: invalidate,
  })
}

/**
 * Deletes a transaction, taking the row out of the list before the request
 * finishes.
 *
 * The one optimistic write here: a delete has a confirmation in front of it, so
 * the row lingering for a round trip afterwards reads as the tap not having
 * registered. `onMutate` snapshots every ledger page so a failure can put it
 * back exactly where it was.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const invalidate = useTransactionInvalidation()

  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.all })

      const previous = queryClient.getQueriesData({ queryKey: transactionKeys.all })

      queryClient.setQueriesData({ queryKey: transactionKeys.lists() }, dropFromPages(id))
      queryClient.setQueriesData({ queryKey: [...transactionKeys.all, 'recent'] }, dropFromList(id))

      return { previous }
    },
    onError: (_error, _id, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: invalidate,
  })
}

/** Removes a row from an infinite query's pages, leaving the shape untouched. */
function dropFromPages(id: string) {
  return (data: unknown) => {
    if (!isPagedTransactions(data)) return data

    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        rows: page.rows.filter((row) => row.id !== id),
      })),
    }
  }
}

/** Removes a row from a plain list query. */
function dropFromList(id: string) {
  return (data: unknown) => {
    if (!Array.isArray(data)) return data

    return data.filter((row: { id?: unknown }) => row?.id !== id)
  }
}

interface PagedTransactions {
  pages: { rows: { id: string }[] }[]
}

/**
 * `setQueriesData` hands every matching cache entry to the updater, including
 * ones this app has not thought about yet, so the shape is checked rather than
 * assumed.
 */
function isPagedTransactions(data: unknown): data is PagedTransactions {
  return (
    typeof data === 'object' &&
    data !== null &&
    'pages' in data &&
    Array.isArray((data as { pages: unknown }).pages)
  )
}
