import { describe, expect, it } from 'vitest'

import {
  isCurrentPeriod,
  isDateKey,
  lastPeriods,
  periodFor,
  previousPeriod,
  shiftPeriod,
} from '../period'

/**
 * Every total in the app is a sum over a period, so an off-by-one here does not
 * look like a bug — it looks like a month where the rent went missing.
 */

describe('periodFor', () => {
  it('is the calendar month when the start day is 1', () => {
    expect(periodFor('2026-03-14', 1)).toEqual({ start: '2026-03-01', end: '2026-03-31' })
  })

  it('handles February in a common year and a leap year', () => {
    expect(periodFor('2026-02-10', 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(periodFor('2028-02-10', 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })

  it('shifts the whole window for a payday start day', () => {
    expect(periodFor('2026-03-14', 25)).toEqual({ start: '2026-02-25', end: '2026-03-24' })
    expect(periodFor('2026-03-25', 25)).toEqual({ start: '2026-03-25', end: '2026-04-24' })
  })

  it('puts the day before the start day in the previous period', () => {
    expect(periodFor('2026-03-24', 25)).toEqual({ start: '2026-02-25', end: '2026-03-24' })
  })

  it('crosses the year boundary', () => {
    expect(periodFor('2026-01-10', 25)).toEqual({ start: '2025-12-25', end: '2026-01-24' })
  })

  it('clamps a start day the database could never hold', () => {
    expect(periodFor('2026-03-14', 0)).toEqual(periodFor('2026-03-14', 1))
    expect(periodFor('2026-03-14', 99)).toEqual(periodFor('2026-03-14', 28))
  })
})

describe('shiftPeriod and previousPeriod', () => {
  it('steps a calendar month at a time', () => {
    const march = periodFor('2026-03-14', 1)

    expect(shiftPeriod(march, -1, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(shiftPeriod(march, 1, 1)).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })

  it('steps a payday period without drifting', () => {
    const period = periodFor('2026-03-14', 25)

    expect(previousPeriod(period, 25)).toEqual({ start: '2026-01-25', end: '2026-02-24' })
  })

  /**
   * The trap: stepping back from a 31-day month and forward again must land on
   * the month it started in. Naive `setMonth` arithmetic on the 31st lands in
   * March on the way back from May.
   */
  it('returns to where it started after a step out and back', () => {
    for (const startDay of [1, 15, 28]) {
      const period = periodFor('2026-05-20', startDay)
      const roundTrip = shiftPeriod(shiftPeriod(period, -1, startDay), 1, startDay)

      expect(roundTrip).toEqual(period)
    }
  })
})

describe('lastPeriods', () => {
  it('returns the given count, oldest first, ending with the current one', () => {
    const periods = lastPeriods(3, '2026-03-14', 1)

    expect(periods.map((period) => period.start)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
    ])
  })

  it('runs back across a year boundary', () => {
    expect(lastPeriods(13, '2026-03-14', 1)[0]?.start).toBe('2025-03-01')
  })
})

describe('isCurrentPeriod', () => {
  it('is true on both boundaries and false outside', () => {
    const period = { start: '2026-03-01', end: '2026-03-31' }

    expect(isCurrentPeriod(period, '2026-03-01')).toBe(true)
    expect(isCurrentPeriod(period, '2026-03-31')).toBe(true)
    expect(isCurrentPeriod(period, '2026-04-01')).toBe(false)
    expect(isCurrentPeriod(period, '2026-02-28')).toBe(false)
  })
})

describe('isDateKey', () => {
  it('accepts a real day and rejects one that only looks like a date', () => {
    expect(isDateKey('2026-03-01')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true)

    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('2026-3-1')).toBe(false)
    expect(isDateKey('yesterday')).toBe(false)
    expect(isDateKey(undefined)).toBe(false)
  })
})
