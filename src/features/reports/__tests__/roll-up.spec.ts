import { describe, expect, it } from 'vitest'

import { movers, rollUp, totalFor } from '../roll-up'
import type { CategoryReportRow } from '../report.types'

/**
 * The Month screen is three numbers and two lists, all five derived from this
 * file. A slice that lands under the wrong heading is not a visual bug — it is
 * a wrong answer to "where did the money go".
 */

const row = (over: Partial<CategoryReportRow>): CategoryReportRow => ({
  category_id: null,
  parent_id: null,
  name: null,
  direction: 'out',
  tone: null,
  icon: null,
  current_minor: 0,
  previous_minor: 0,
  current_count: 0,
  ...over,
})

const FOOD = 'food-id'
const KONBINI = 'konbini-id'
const MARKET = 'market-id'
const RENT = 'rent-id'

describe('rollUp', () => {
  it('adds children into their heading', () => {
    const slices = rollUp(
      [
        row({ category_id: FOOD, name: 'Food', tone: 'clay', current_minor: 1000 }),
        row({ category_id: KONBINI, parent_id: FOOD, name: 'Konbini', current_minor: 2000 }),
        row({ category_id: MARKET, parent_id: FOOD, name: 'Supermarket', current_minor: 3000 }),
      ],
      'out',
    )

    expect(slices).toHaveLength(1)
    expect(slices[0]).toMatchObject({ id: FOOD, name: 'Food', currentMinor: 6000, tone: 'clay' })
  })

  it("uses the heading's name even when only its children have money", () => {
    // The heading's own row is present with zero in both periods, which is
    // exactly what the report returns for a parent nobody files directly under.
    const slices = rollUp(
      [
        row({ category_id: FOOD, name: 'Food', tone: 'clay' }),
        row({ category_id: KONBINI, parent_id: FOOD, name: 'Konbini', current_minor: 2000 }),
      ],
      'out',
    )

    expect(slices[0]?.name).toBe('Food')
    expect(slices[0]?.tone).toBe('clay')
  })

  it('keeps money whose category was deleted, so the shares add up', () => {
    const slices = rollUp(
      [row({ category_id: RENT, name: 'Rent', current_minor: 7500 }), row({ current_minor: 2500 })],
      'out',
    )

    expect(slices.map((slice) => slice.sharePercent)).toEqual([75, 25])
    expect(slices.at(-1)?.id).toBeNull()
  })

  it('keeps only the direction asked for', () => {
    const rows = [
      row({ category_id: RENT, name: 'Rent', current_minor: 1000 }),
      row({ category_id: 'salary', name: 'Salary', direction: 'in', current_minor: 9000 }),
    ]

    expect(rollUp(rows, 'out')).toHaveLength(1)
    expect(rollUp(rows, 'in')[0]?.name).toBe('Salary')
  })

  it('sorts by the current period, largest first', () => {
    const slices = rollUp(
      [
        row({ category_id: 'a', name: 'A', current_minor: 100 }),
        row({ category_id: 'b', name: 'B', current_minor: 900 }),
      ],
      'out',
    )

    expect(slices.map((slice) => slice.name)).toEqual(['B', 'A'])
  })

  it('gives every slice 0% rather than NaN in an empty period', () => {
    const slices = rollUp([row({ category_id: 'a', name: 'A', previous_minor: 500 })], 'out')

    expect(slices[0]?.sharePercent).toBe(0)
  })
})

describe('movers', () => {
  const slices = rollUp(
    [
      row({ category_id: 'a', name: 'Konbini', current_minor: 8000, previous_minor: 10000 }),
      row({ category_id: 'b', name: 'Rent', current_minor: 90000, previous_minor: 90000 }),
      row({ category_id: 'c', name: 'Fun', current_minor: 1000, previous_minor: 0 }),
      row({ category_id: 'd', name: 'Health', current_minor: 0, previous_minor: 500 }),
    ],
    'out',
  )

  it('drops the categories that did not move', () => {
    expect(movers(slices, 10).map((mover) => mover.name)).not.toContain('Rent')
  })

  it('ranks by money moved, not by percentage', () => {
    // Fun appeared out of nothing; Konbini still moved more actual money.
    expect(movers(slices, 1)[0]?.name).toBe('Konbini')
  })

  it('reports a fall as a negative delta and percentage', () => {
    const konbini = movers(slices, 10).find((mover) => mover.name === 'Konbini')

    expect(konbini?.deltaMinor).toBe(-2000)
    expect(konbini?.deltaPercent).toBe(-20)
  })

  it('leaves the percentage null when there was nothing to grow from', () => {
    const fun = movers(slices, 10).find((mover) => mover.name === 'Fun')

    expect(fun?.deltaPercent).toBeNull()
  })

  it('honours the limit', () => {
    expect(movers(slices, 2)).toHaveLength(2)
  })
})

describe('totalFor', () => {
  it('sums one direction only', () => {
    const rows = [
      row({ current_minor: 1000 }),
      row({ current_minor: 500 }),
      row({ direction: 'in', current_minor: 9000 }),
    ]

    expect(totalFor(rows, 'out')).toBe(1500)
    expect(totalFor(rows, 'in')).toBe(9000)
  })
})
