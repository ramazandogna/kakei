import type { LocationQuery, LocationQueryRaw } from 'vue-router'

import { isDateKey } from '@/shared/lib/period'
import type { Direction, Necessity, TransactionFilters } from './transaction.types'

/**
 * The ledger's filters, in the address bar.
 *
 * "What did I spend at konbini in March" is a question worth being able to send
 * to yourself, so the filter set lives in the query string rather than in a
 * component's state: reloading keeps it, and the back button steps out of it.
 */

/**
 * Reads the first value of a query parameter, ignoring repeats.
 *
 * Takes `undefined` as well as a value: with `noUncheckedIndexedAccess` an
 * index into `LocationQuery` is always possibly absent, and that is exactly the
 * case this has to answer for.
 */
function first(value: LocationQuery[string] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value

  return typeof raw === 'string' && raw !== '' ? raw : undefined
}

function isDirection(value: string | undefined): value is Direction {
  return value === 'in' || value === 'out'
}

function isNecessity(value: string | undefined): value is Necessity {
  return value === 'need' || value === 'want'
}

/**
 * Builds a filter set from a route's query.
 *
 * Anything unrecognised is dropped rather than passed through: these values end
 * up in a database filter, and a hand-edited URL is untrusted input.
 *
 * @example
 * ```ts
 * fromQuery({ direction: 'out', from: '2026-03-01' })
 * // { direction: 'out', from: '2026-03-01' }
 * ```
 */
export function fromQuery(query: LocationQuery): TransactionFilters {
  const filters: TransactionFilters = {}

  const direction = first(query['direction'])
  if (isDirection(direction)) filters.direction = direction

  const necessity = first(query['necessity'])
  if (isNecessity(necessity)) filters.necessity = necessity

  const from = first(query['from'])
  if (isDateKey(from)) filters.from = from

  const to = first(query['to'])
  if (isDateKey(to)) filters.to = to

  const search = first(query['q'])
  if (search) filters.search = search.slice(0, 80)

  const categories = first(query['category'])
  if (categories) {
    const ids = categories
      .split(',')
      // Uuids only: the value goes into an `in.(…)` filter, and anything that
      // is not one cannot match a row anyway.
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))

    if (ids.length > 0) filters.categoryIds = ids
  }

  return filters
}

/**
 * The inverse: a filter set as query parameters.
 *
 * Empty fields are omitted, so an unfiltered ledger has a clean URL.
 *
 * @example
 * ```ts
 * toQuery({ direction: 'out' })  // { direction: 'out' }
 * ```
 */
export function toQuery(filters: TransactionFilters): LocationQueryRaw {
  const query: LocationQueryRaw = {}

  if (filters.direction) query['direction'] = filters.direction
  if (filters.necessity) query['necessity'] = filters.necessity
  if (filters.from) query['from'] = filters.from
  if (filters.to) query['to'] = filters.to

  const search = filters.search?.trim()
  if (search) query['q'] = search

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query['category'] = filters.categoryIds.join(',')
  }

  return query
}

/**
 * How many filters are on, for the badge on the Filters button.
 *
 * A date range counts as one, because that is how it reads on screen.
 *
 * @example
 * ```ts
 * countActive({ direction: 'out', from: '2026-03-01', to: '2026-03-31' })  // 2
 * ```
 */
export function countActive(filters: TransactionFilters): number {
  let count = 0

  if (filters.direction) count += 1
  if (filters.necessity) count += 1
  if (filters.from || filters.to) count += 1
  if (filters.search?.trim()) count += 1
  if (filters.categoryIds && filters.categoryIds.length > 0) count += 1

  return count
}
