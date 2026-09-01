import type { Direction } from '@/features/categories/category.types'

/**
 * One category's two periods, straight from `category_report`.
 *
 * `category_id` is null for money whose category was deleted. The row is kept
 * rather than dropped, because without it the slices stop adding up to the
 * total printed above them.
 */
export interface CategoryReportRow {
  category_id: string | null
  parent_id: string | null
  name: string | null
  direction: Direction
  tone: string | null
  icon: string | null
  current_minor: number
  previous_minor: number
  current_count: number
}

/** One period's totals, from `monthly_totals`. */
export interface MonthlyTotalRow {
  period_start: string
  in_minor: number
  out_minor: number
}

/** A top-level category rolled up for the donut and the movers list. */
export interface CategorySlice {
  /** Null for the uncategorised roll-up. */
  id: string | null
  name: string | null
  tone: string | null
  icon: string | null
  currentMinor: number
  previousMinor: number
  currentCount: number
  /** Percentage of the period's total for this direction, 0-100. */
  sharePercent: number
}

/** A category that moved between the two periods, for "against last month". */
export interface CategoryMover extends CategorySlice {
  /** Signed difference in minor units; positive means more was spent. */
  deltaMinor: number
  /** Signed percentage change, or `null` when the previous period was zero. */
  deltaPercent: number | null
}
