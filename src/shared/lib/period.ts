import { fromDateKey, toDateKey } from 'rei-kit'

/**
 * The accounting period a screen is looking at.
 *
 * Not always a calendar month: someone budgeting from payday sets
 * `month_start_day` to 25, and every total in the app has to agree about where
 * that period begins and ends.
 */
export interface Period {
  /** First day, inclusive, as `YYYY-MM-DD`. */
  start: string
  /** Last day, inclusive. */
  end: string
}

/**
 * Whether a string is a real calendar day in `YYYY-MM-DD` form.
 *
 * Shape alone is not enough: `2026-13-45` matches the pattern and is not a
 * date. Both the month header and the ledger filters read day keys out of the
 * query string, which is untrusted input.
 *
 * @example
 * ```ts
 * isDateKey('2026-02-29')  // false — 2026 is not a leap year
 * isDateKey('2026-03-01')  // true
 * ```
 */
export function isDateKey(value: string | undefined): value is string {
  if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

/** Keeps a start day inside the range the database allows. */
function clampStartDay(startDay: number): number {
  if (!Number.isFinite(startDay)) return 1

  return Math.min(28, Math.max(1, Math.trunc(startDay)))
}

/**
 * The period containing a given day.
 *
 * @param dateKey - Any day in the period, as `YYYY-MM-DD`.
 * @param startDay - Day of the month the period begins on, 1-28.
 *
 * @example
 * ```ts
 * periodFor('2026-03-14', 1)   // { start: '2026-03-01', end: '2026-03-31' }
 * periodFor('2026-03-14', 25)  // { start: '2026-02-25', end: '2026-03-24' }
 * ```
 */
export function periodFor(dateKey: string, startDay: number): Period {
  const day = clampStartDay(startDay)
  const date = fromDateKey(dateKey)

  // Before the start day, the period is the one that opened last month.
  const monthOffset = date.getDate() >= day ? 0 : -1
  const start = new Date(date.getFullYear(), date.getMonth() + monthOffset, day)

  // Day `day - 1` of the following month. Day 0 is the last day of the previous
  // month, which is exactly what a start day of 1 needs.
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1)

  return { start: toDateKey(start), end: toDateKey(end) }
}

/**
 * The same period, moved by whole periods.
 *
 * @param period - Period to move.
 * @param months - Periods to add; negative goes back.
 * @param startDay - Day of the month the period begins on, 1-28.
 *
 * @example
 * ```ts
 * shiftPeriod({ start: '2026-03-01', end: '2026-03-31' }, -1, 1)
 * // { start: '2026-02-01', end: '2026-02-28' }
 * ```
 */
export function shiftPeriod(period: Period, months: number, startDay: number): Period {
  const start = fromDateKey(period.start)
  const moved = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())

  return periodFor(toDateKey(moved), startDay)
}

/**
 * The period before this one — the whole point of the Month screen.
 *
 * @example
 * ```ts
 * previousPeriod({ start: '2026-01-01', end: '2026-01-31' }, 1)
 * // { start: '2025-12-01', end: '2025-12-31' }
 * ```
 */
export function previousPeriod(period: Period, startDay: number): Period {
  return shiftPeriod(period, -1, startDay)
}

/**
 * The last `count` periods ending with the one containing `dateKey`, oldest
 * first — the twelve bars on Insights.
 *
 * @param count - How many periods, including the current one.
 * @param dateKey - Any day in the last period.
 * @param startDay - Day of the month the period begins on, 1-28.
 *
 * @example
 * ```ts
 * lastPeriods(3, '2026-03-14', 1).map((p) => p.start)
 * // ['2026-01-01', '2026-02-01', '2026-03-01']
 * ```
 */
export function lastPeriods(count: number, dateKey: string, startDay: number): Period[] {
  const current = periodFor(dateKey, startDay)
  const periods: Period[] = []

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    periods.push(shiftPeriod(current, -offset, startDay))
  }

  return periods
}

/**
 * Whether a period is the one today falls in.
 *
 * Used to stop the header offering a "next" step into a period that has not
 * started yet.
 *
 * @example
 * ```ts
 * isCurrentPeriod({ start: '2026-03-01', end: '2026-03-31' }, '2026-03-14')  // true
 * ```
 */
export function isCurrentPeriod(period: Period, todayKey: string): boolean {
  return todayKey >= period.start && todayKey <= period.end
}
