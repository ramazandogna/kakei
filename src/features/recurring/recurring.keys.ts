import type { Period } from '@/shared/lib/period'

/** Cache keys for fixed monthly entries. */
export const recurringKeys = {
  all: ['recurring'] as const,
  list: () => [...recurringKeys.all, 'list'] as const,
  pending: (period: Period) => [...recurringKeys.all, 'pending', period.start, period.end] as const,
}
