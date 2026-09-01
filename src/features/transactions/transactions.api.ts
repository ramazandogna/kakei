import { supabase } from '@/shared/lib/supabase'
import { toAppError } from 'rei-kit'

import type {
  NewTransaction,
  Transaction,
  TransactionCursor,
  TransactionFilters,
  TransactionPage,
  TransactionPatch,
} from './transaction.types'

/**
 * Data access for transactions.
 *
 * Pure async functions — no Vue, no Pinia, no vue-query. Every function either
 * resolves with data or throws an `AppError`.
 */

/** How many rows one page of the ledger holds. */
export const PAGE_SIZE = 40

/**
 * Escapes a value for PostgREST's `or` filter grammar.
 *
 * Inside `or(...)` a comma separates conditions and a parenthesis closes the
 * group, so a merchant called `Foo, Inc. (Ltd)` typed into the search box would
 * otherwise be parsed as filter syntax. Double-quoting the value and escaping
 * the quotes and backslashes inside it is what PostgREST asks for.
 */
function quoteForOr(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** Escapes the wildcards `like` gives meaning to, so a search for `%` finds `%`. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/**
 * One page of the ledger, newest first.
 *
 * Keyset pagination on `(occurred_on, id)` rather than `range()`: an offset
 * re-reads every row it skips, and shifts by one the moment a transaction is
 * added while someone is scrolling. The id is the tie-breaker, because a day
 * routinely holds several rows.
 *
 * @param filters - What to select. An absent field means no restriction.
 * @param cursor - Where the previous page stopped; `null` for the first page.
 *
 * @example
 * ```ts
 * const first = await listTransactions({ direction: 'out' }, null)
 * const more = first.next ? await listTransactions({ direction: 'out' }, first.next) : null
 * ```
 */
export async function listTransactions(
  filters: TransactionFilters,
  cursor: TransactionCursor | null,
): Promise<TransactionPage> {
  // Filters before ordering: `.order()` returns the transform builder, which no
  // longer accepts `.eq()`, so the two cannot be interleaved.
  let query = applyFilters(selectTransactions(), filters)

  if (cursor) {
    // Strictly after the cursor in the composite order: an earlier day, or the
    // same day with a smaller id.
    query = query.or(
      `occurred_on.lt.${cursor.occurredOn},and(occurred_on.eq.${cursor.occurredOn},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await query
    .order('occurred_on', { ascending: false })
    .order('id', { ascending: false })
    // One more than the page, so "is there another page" needs no count query.
    .limit(PAGE_SIZE + 1)

  if (error) throw toAppError(error)

  const hasMore = data.length > PAGE_SIZE
  const rows = hasMore ? data.slice(0, PAGE_SIZE) : data
  const last = rows.at(-1)

  return {
    rows,
    next: hasMore && last ? { occurredOn: last.occurred_on, id: last.id } : null,
  }
}

/** Every transaction in a date range, oldest last. Used by the Month screen. */
export async function listTransactionsBetween(from: string, to: string): Promise<Transaction[]> {
  const { data, error } = await selectTransactions()
    .gte('occurred_on', from)
    .lte('occurred_on', to)
    .order('occurred_on', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw toAppError(error)
  return data
}

/** Creates a transaction and returns the stored row, including its id. */
export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert(input).select().single()

  if (error) throw toAppError(error)
  return data
}

/** Applies a partial update and returns the updated row. */
export async function updateTransaction(id: string, patch: TransactionPatch): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw toAppError(error)
  return data
}

/** How many transactions the account holds, for the Profile stat card. */
export async function countTransactions(): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })

  if (error) throw toAppError(error)
  return count ?? 0
}

/** Deletes a transaction. There is no archive: a wrong entry is just wrong. */
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)

  if (error) throw toAppError(error)
}

/** A fresh select over the table, before any filter or ordering narrows it. */
function selectTransactions() {
  return supabase.from('transactions').select('*')
}

type TransactionQuery = ReturnType<typeof selectTransactions>

/** Narrows a select by the filter set. An absent field means no restriction. */
function applyFilters(query: TransactionQuery, filters: TransactionFilters): TransactionQuery {
  let next = query

  if (filters.direction) next = next.eq('direction', filters.direction)
  if (filters.necessity) next = next.eq('necessity', filters.necessity)
  if (filters.from) next = next.gte('occurred_on', filters.from)
  if (filters.to) next = next.lte('occurred_on', filters.to)

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    next = next.in('category_id', filters.categoryIds)
  }

  const search = filters.search?.trim()

  if (search) {
    const pattern = quoteForOr(`%${escapeLike(search)}%`)

    // `or` rather than two filters: a match in either column should show the
    // row, and PostgREST ANDs top-level filters together.
    next = next.or(`merchant.ilike.${pattern},note.ilike.${pattern}`)
  }

  return next
}
