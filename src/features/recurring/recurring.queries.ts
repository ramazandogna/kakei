import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { Period } from '@/shared/lib/period'
import {
  archiveRecurring,
  createRecurring,
  fetchPendingRecurring,
  listRecurring,
  postRecurring,
  unarchiveRecurring,
  updateRecurring,
} from './recurring.api'
import { recurringKeys } from './recurring.keys'
import type { RecurringPatch } from './recurring.types'
import { transactionKeys } from '@/features/transactions/transactions.keys'
import { reportKeys } from '@/features/reports/reports.keys'

/** Vue bindings for fixed monthly entries. */

/** Every active template. */
export function useRecurringEntries() {
  return useQuery({
    queryKey: recurringKeys.list(),
    queryFn: listRecurring,
    staleTime: 5 * 60_000,
  })
}

/** What is still missing from the period on screen. */
export function usePendingRecurring(period: MaybeRefOrGetter<Period>) {
  return useQuery({
    queryKey: computed(() => recurringKeys.pending(toValue(period))),
    queryFn: () => fetchPendingRecurring(toValue(period)),
  })
}

/** Templates change what is pending; posting changes the ledger as well. */
function useRecurringInvalidation(includeLedger = false) {
  const queryClient = useQueryClient()

  return () => {
    const work = [queryClient.invalidateQueries({ queryKey: recurringKeys.all })]

    if (includeLedger) {
      work.push(
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: reportKeys.all }),
      )
    }

    return Promise.all(work)
  }
}

export function useCreateRecurring() {
  const invalidate = useRecurringInvalidation()

  return useMutation({ mutationFn: createRecurring, onSuccess: invalidate })
}

export function useUpdateRecurring() {
  const invalidate = useRecurringInvalidation()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecurringPatch }) =>
      updateRecurring(id, patch),
    onSuccess: invalidate,
  })
}

export function useArchiveRecurring() {
  const invalidate = useRecurringInvalidation()

  return useMutation({ mutationFn: archiveRecurring, onSuccess: invalidate })
}

export function useUnarchiveRecurring() {
  const invalidate = useRecurringInvalidation()

  return useMutation({ mutationFn: unarchiveRecurring, onSuccess: invalidate })
}

/** Posts the pending entries into the ledger. */
export function usePostRecurring() {
  const invalidate = useRecurringInvalidation(true)

  return useMutation({ mutationFn: postRecurring, onSuccess: invalidate })
}
