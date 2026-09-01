import type { Period } from '@/shared/lib/period'

/**
 * Cache keys for the two report functions.
 *
 * Keyed by the period boundaries rather than by "this month", so stepping back
 * and forward through the header reuses what has already been fetched.
 *
 * @example
 * ```ts
 * reportKeys.categories(period, previous)
 * // ['reports', 'categories', '2026-03-01', '2026-03-31', '2026-02-01', '2026-02-28']
 * ```
 */
export const reportKeys = {
  all: ['reports'] as const,
  categories: (period: Period, previous: Period) =>
    [
      ...reportKeys.all,
      'categories',
      period.start,
      period.end,
      previous.start,
      previous.end,
    ] as const,
  monthly: (from: string, to: string, startDay: number) =>
    [...reportKeys.all, 'monthly', from, to, startDay] as const,
}
