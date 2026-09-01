import { useQuery } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { Period } from '@/shared/lib/period'
import { fetchCategoryReport, fetchMonthlyTotals } from './reports.api'
import { reportKeys } from './reports.keys'

/**
 * Vue bindings for the reports.
 *
 * Both are keyed by their period boundaries, so stepping back through the month
 * header and forward again costs nothing.
 */

/** Every category's totals for a period and the one before it. */
export function useCategoryReport(
  period: MaybeRefOrGetter<Period>,
  previous: MaybeRefOrGetter<Period>,
) {
  return useQuery({
    queryKey: computed(() => reportKeys.categories(toValue(period), toValue(previous))),
    queryFn: () => fetchCategoryReport(toValue(period), toValue(previous)),
  })
}

/** In and out per period, for the twelve bars on Insights. */
export function useMonthlyTotals(
  from: MaybeRefOrGetter<string>,
  to: MaybeRefOrGetter<string>,
  startDay: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => reportKeys.monthly(toValue(from), toValue(to), toValue(startDay))),
    queryFn: () => fetchMonthlyTotals(toValue(from), toValue(to), toValue(startDay)),
  })
}
