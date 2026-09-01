import { describe, expect, it } from 'vitest'

import { groupByDay, totals } from '../group-by-day'
import type { Transaction } from '../transaction.types'

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'id',
  user_id: 'user',
  occurred_on: '2026-03-14',
  direction: 'out',
  amount_minor: 100,
  category_id: null,
  necessity: null,
  merchant: null,
  note: null,
  created_at: '2026-03-14T00:00:00Z',
  ...over,
})

describe('groupByDay', () => {
  it('keeps the newest-first order and inserts the boundaries', () => {
    const days = groupByDay([
      tx({ id: 'a', occurred_on: '2026-03-14' }),
      tx({ id: 'b', occurred_on: '2026-03-14' }),
      tx({ id: 'c', occurred_on: '2026-03-13' }),
    ])

    expect(days.map((day) => day.dateKey)).toEqual(['2026-03-14', '2026-03-13'])
    expect(days[0]?.rows.map((row) => row.id)).toEqual(['a', 'b'])
  })

  it('subtotals each day by direction', () => {
    const days = groupByDay([
      tx({ id: 'a', direction: 'in', amount_minor: 5000 }),
      tx({ id: 'b', direction: 'out', amount_minor: 1200 }),
      tx({ id: 'c', direction: 'out', amount_minor: 800 }),
    ])

    expect(days[0]).toMatchObject({ inMinor: 5000, outMinor: 2000 })
  })

  it('returns nothing for an empty page', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('totals', () => {
  it('sums both directions across a whole page', () => {
    expect(
      totals([
        tx({ direction: 'in', amount_minor: 300 }),
        tx({ direction: 'out', amount_minor: 100 }),
      ]),
    ).toEqual({ inMinor: 300, outMinor: 100 })
  })
})
