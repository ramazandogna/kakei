import { share } from '@/shared/lib/money'
import type { Direction } from '@/features/categories/category.types'
import type { CategoryMover, CategoryReportRow, CategorySlice } from './report.types'

/**
 * Rolls the report's rows up to top level, for one direction.
 *
 * A child's money belongs to its heading: the donut shows "Food", not
 * "Konbini", or six categories become nineteen slices. The row that carries the
 * heading's own name is found by id among the rows, so a child whose parent had
 * no spending of its own still lands under the right name.
 *
 * @param rows - Every row `category_report` returned.
 * @param direction - Which side of the ledger to keep.
 * @returns Slices sorted by the current period, largest first.
 *
 * @example
 * ```ts
 * rollUp(rows, 'out')[0]  // { name: 'Food', currentMinor: 42000, sharePercent: 38, … }
 * ```
 */
export function rollUp(rows: CategoryReportRow[], direction: Direction): CategorySlice[] {
  const scoped = rows.filter((row) => row.direction === direction)

  // Every row that names a category, so a child can borrow its parent's name
  // even when the parent has no money of its own in either period.
  const named = new Map(
    scoped.filter((row) => row.category_id).map((row) => [row.category_id, row]),
  )

  const slices = new Map<string | null, CategorySlice>()

  for (const row of scoped) {
    const topId = row.parent_id ?? row.category_id
    const source = (topId === null ? null : named.get(topId)) ?? row

    const existing = slices.get(topId)

    if (existing) {
      existing.currentMinor += row.current_minor
      existing.previousMinor += row.previous_minor
      existing.currentCount += row.current_count
      continue
    }

    slices.set(topId, {
      id: topId,
      // The parent's own name when it is known, never the child's.
      name: topId === row.category_id ? row.name : (source.name ?? null),
      tone: source.tone,
      icon: source.icon,
      currentMinor: row.current_minor,
      previousMinor: row.previous_minor,
      currentCount: row.current_count,
      sharePercent: 0,
    })
  }

  const list = [...slices.values()]
  const total = list.reduce((sum, slice) => sum + slice.currentMinor, 0)

  for (const slice of list) {
    slice.sharePercent = share(slice.currentMinor, total)
  }

  return list.sort((a, b) => b.currentMinor - a.currentMinor)
}

/**
 * The categories that moved most between the two periods.
 *
 * Ranked by absolute money moved rather than by percentage: a category that
 * went from ¥200 to ¥400 doubled, and nobody's month changed because of it.
 *
 * @param slices - Output of {@link rollUp}.
 * @param limit - How many to keep.
 * @returns Movers, largest absolute change first.
 *
 * @example
 * ```ts
 * movers(rollUp(rows, 'out'), 4)[0]
 * // { name: 'Food', deltaMinor: -2000, deltaPercent: -20, … }
 * ```
 */
export function movers(slices: CategorySlice[], limit: number): CategoryMover[] {
  return slices
    .map((slice) => {
      const deltaMinor = slice.currentMinor - slice.previousMinor

      return {
        ...slice,
        deltaMinor,
        // A rise from nothing is not "infinity percent" — it is new, and the
        // view says so instead of printing a number that means nothing.
        deltaPercent:
          slice.previousMinor > 0 ? Math.round((deltaMinor / slice.previousMinor) * 100) : null,
      }
    })
    .filter((mover) => mover.deltaMinor !== 0)
    .sort((a, b) => Math.abs(b.deltaMinor) - Math.abs(a.deltaMinor))
    .slice(0, limit)
}

/** The period's total for one direction, in minor units. */
export function totalFor(rows: CategoryReportRow[], direction: Direction): number {
  return rows
    .filter((row) => row.direction === direction)
    .reduce((sum, row) => sum + row.current_minor, 0)
}
