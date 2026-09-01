import { supabase } from '@/shared/lib/supabase'
import { toAppError } from 'rei-kit'

import type { Period } from '@/shared/lib/period'
import type { CategoryReportRow, MonthlyTotalRow } from './report.types'

/**
 * The two report round trips.
 *
 * Both are Postgres functions rather than a select the browser aggregates: a
 * month with 400 transactions is 400 rows over the wire and a reduce on the
 * main thread, against one row per category and a group-by the database does
 * anyway. Both are `security invoker`, so RLS still scopes them to the caller.
 */

/**
 * Every category's totals for two periods at once.
 *
 * One call rather than two, because "against last month" is the Month screen's
 * reason to exist and a second request would make it the slowest part of it.
 */
export async function fetchCategoryReport(
  period: Period,
  previous: Period,
): Promise<CategoryReportRow[]> {
  const { data, error } = await supabase.rpc('category_report', {
    p_start: period.start,
    p_end: period.end,
    p_prev_start: previous.start,
    p_prev_end: previous.end,
  })

  if (error) throw toAppError(error)

  // The generated types describe the function's declared OUT columns, which
  // Postgres always types as nullable. The rows are exactly this shape.
  return data as unknown as CategoryReportRow[]
}

/**
 * In and out per period, for the twelve-month bars.
 *
 * @param from - First day of the oldest period.
 * @param to - Last day of the newest.
 * @param startDay - `profiles.month_start_day`, so the buckets line up with
 *   every other total in the app.
 */
export async function fetchMonthlyTotals(
  from: string,
  to: string,
  startDay: number,
): Promise<MonthlyTotalRow[]> {
  const { data, error } = await supabase.rpc('monthly_totals', {
    p_from: from,
    p_to: to,
    p_start_day: startDay,
  })

  if (error) throw toAppError(error)

  return data as unknown as MonthlyTotalRow[]
}
