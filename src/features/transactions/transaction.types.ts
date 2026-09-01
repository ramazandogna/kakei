import type { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import type { Direction } from '@/features/categories/category.types'

export type { Direction }

/** Whether an expense was something needed or something wanted. */
export type Necessity = 'need' | 'want'

/** A transaction row as read from the database. */
export type Transaction = Tables<'transactions'>

/** Fields accepted when creating a transaction; database defaults stay optional. */
export type NewTransaction = TablesInsert<'transactions'>

/** Partial fields accepted when updating an existing transaction. */
export type TransactionPatch = TablesUpdate<'transactions'>

/**
 * What the Ledger selects.
 *
 * Every field is optional and an absent field means "no restriction", so the
 * unfiltered ledger and a filtered one are the same query with the same code
 * path.
 */
export interface TransactionFilters {
  direction?: Direction
  /** A top-level category matches its children too — see `categories.api`. */
  categoryIds?: string[]
  necessity?: Necessity
  /** Inclusive, `YYYY-MM-DD`. */
  from?: string
  /** Inclusive, `YYYY-MM-DD`. */
  to?: string
  /** Matched against merchant and note, case-insensitively. */
  search?: string
}

/** Where the next page starts. `null` on the first page. */
export interface TransactionCursor {
  occurredOn: string
  id: string
}

/** One page of the ledger. */
export interface TransactionPage {
  rows: Transaction[]
  /** Absent when this was the last page. */
  next: TransactionCursor | null
}

/** A day's worth of transactions, with the day's own subtotals. */
export interface TransactionDay {
  dateKey: string
  rows: Transaction[]
  inMinor: number
  outMinor: number
}
