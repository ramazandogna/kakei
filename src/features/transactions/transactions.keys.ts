import type { TransactionFilters } from './transaction.types'

/**
 * Cache keys for transaction queries.
 *
 * The filters go into the key as a normalised object rather than the object the
 * component happens to hold: two filter sets that select the same rows have to
 * be the same cache entry, or every re-render of the filter sheet starts a
 * fresh request.
 *
 * @example
 * ```ts
 * transactionKeys.all                            // ['transactions']
 * transactionKeys.list({ direction: 'out' })     // ['transactions', 'list', {…}]
 * ```
 */
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), normalise(filters)] as const,
  recent: (from: string, to: string) => [...transactionKeys.all, 'recent', from, to] as const,
  count: () => [...transactionKeys.all, 'count'] as const,
}

/** Drops empty fields and sorts the category ids, so equal filters compare equal. */
function normalise(filters: TransactionFilters): Record<string, unknown> {
  const entries: [string, unknown][] = []

  if (filters.direction) entries.push(['direction', filters.direction])
  if (filters.necessity) entries.push(['necessity', filters.necessity])
  if (filters.from) entries.push(['from', filters.from])
  if (filters.to) entries.push(['to', filters.to])

  const search = filters.search?.trim()
  if (search) entries.push(['search', search.toLowerCase()])

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    entries.push(['categoryIds', [...filters.categoryIds].sort()])
  }

  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)))
}
