import type { Transaction, TransactionDay } from './transaction.types'

/**
 * Groups a page of the ledger into days, with each day's own subtotals.
 *
 * The rows arrive newest first and stay in that order: this only inserts the
 * boundaries, so a day is complete as long as the rows for it are contiguous —
 * which the `(occurred_on desc, id desc)` ordering guarantees.
 *
 * @param rows - Transactions, newest first.
 * @returns Days in the same order, each with its rows and subtotals.
 *
 * @example
 * ```ts
 * groupByDay(rows)[0]
 * // { dateKey: '2026-03-14', rows: [...], inMinor: 0, outMinor: 1800 }
 * ```
 */
export function groupByDay(rows: Transaction[]): TransactionDay[] {
  const days: TransactionDay[] = []
  let current: TransactionDay | undefined

  for (const row of rows) {
    if (!current || current.dateKey !== row.occurred_on) {
      current = { dateKey: row.occurred_on, rows: [], inMinor: 0, outMinor: 0 }
      days.push(current)
    }

    current.rows.push(row)

    if (row.direction === 'in') current.inMinor += row.amount_minor
    else current.outMinor += row.amount_minor
  }

  return days
}

/** The in and out totals of a set of transactions, in minor units. */
export function totals(rows: Transaction[]): { inMinor: number; outMinor: number } {
  let inMinor = 0
  let outMinor = 0

  for (const row of rows) {
    if (row.direction === 'in') inMinor += row.amount_minor
    else outMinor += row.amount_minor
  }

  return { inMinor, outMinor }
}
