import { describe, expect, it } from 'vitest'

import { countActive, fromQuery, toQuery } from '../ledger-filters'

/**
 * The query string is untrusted input that ends up in a database filter, so
 * what this drops matters more than what it keeps.
 */

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

describe('fromQuery', () => {
  it('reads a full filter set', () => {
    expect(
      fromQuery({
        direction: 'out',
        necessity: 'want',
        from: '2026-03-01',
        to: '2026-03-31',
        q: 'konbini',
        category: UUID,
      }),
    ).toEqual({
      direction: 'out',
      necessity: 'want',
      from: '2026-03-01',
      to: '2026-03-31',
      search: 'konbini',
      categoryIds: [UUID],
    })
  })

  it('drops values it does not recognise', () => {
    expect(
      fromQuery({
        direction: 'sideways',
        necessity: 'maybe',
        from: '2026-02-30',
        to: 'yesterday',
        category: 'drop table',
      }),
    ).toEqual({})
  })

  it('keeps only the uuids out of a mixed category list', () => {
    expect(fromQuery({ category: `${UUID},not-an-id` }).categoryIds).toEqual([UUID])
  })

  it('takes the first value when a parameter repeats', () => {
    expect(fromQuery({ direction: ['out', 'in'] }).direction).toBe('out')
  })

  it('caps the search so a filter cannot be used to send an essay', () => {
    expect(fromQuery({ q: 'x'.repeat(500) }).search).toHaveLength(80)
  })

  it('returns an empty set for an empty query', () => {
    expect(fromQuery({})).toEqual({})
  })
})

describe('toQuery', () => {
  it('omits everything that is not set', () => {
    expect(toQuery({})).toEqual({})
    expect(toQuery({ search: '   ' })).toEqual({})
    expect(toQuery({ categoryIds: [] })).toEqual({})
  })

  it('round-trips a filter set through the query string', () => {
    const filters = {
      direction: 'out' as const,
      from: '2026-03-01',
      to: '2026-03-31',
      search: 'konbini',
      categoryIds: [UUID],
    }

    expect(fromQuery(toQuery(filters) as Record<string, string>)).toEqual(filters)
  })
})

describe('countActive', () => {
  it('counts a date range as one filter, because that is how it reads', () => {
    expect(countActive({ from: '2026-03-01', to: '2026-03-31' })).toBe(1)
    expect(countActive({ from: '2026-03-01' })).toBe(1)
  })

  it('counts the rest one apiece', () => {
    expect(
      countActive({
        direction: 'out',
        necessity: 'need',
        search: 'x',
        categoryIds: [UUID],
        from: '2026-03-01',
      }),
    ).toBe(5)
  })

  it('ignores a search that is only whitespace', () => {
    expect(countActive({ search: '  ' })).toBe(0)
  })
})
