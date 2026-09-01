import { describe, expect, it } from 'vitest'

import { topLevelOf, toTree } from '../category-tree'
import type { Category } from '../category.types'

const category = (over: Partial<Category> & { id: string }): Category => ({
  user_id: 'user',
  parent_id: null,
  name: 'Category',
  direction: 'out',
  tone: null,
  icon: null,
  sort_order: 0,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('toTree', () => {
  const rows = [
    category({ id: 'food', name: 'Food', sort_order: 0 }),
    category({ id: 'konbini', name: 'Konbini', parent_id: 'food', sort_order: 1 }),
    category({ id: 'market', name: 'Supermarket', parent_id: 'food', sort_order: 0 }),
    category({ id: 'rent', name: 'Rent', sort_order: 1 }),
    category({ id: 'salary', name: 'Salary', direction: 'in' }),
  ]

  it('keeps only the direction asked for', () => {
    expect(toTree(rows, 'out').map((node) => node.category.id)).toEqual(['food', 'rent'])
    expect(toTree(rows, 'in').map((node) => node.category.id)).toEqual(['salary'])
  })

  it('nests children under their heading, in sort order', () => {
    const [food] = toTree(rows, 'out')

    expect(food?.children.map((child) => child.name)).toEqual(['Supermarket', 'Konbini'])
  })

  /**
   * A child whose parent is not in the list — archived while the child was not
   * — becomes a heading rather than disappearing. Dropping it would take its
   * money out of the picker with no way to notice.
   */
  it('promotes an orphan instead of losing it', () => {
    const orphaned = [category({ id: 'konbini', name: 'Konbini', parent_id: 'food' })]

    expect(toTree(orphaned, 'out').map((node) => node.category.id)).toEqual(['konbini'])
  })

  it('falls back to the name when two categories share a sort order', () => {
    const tied = [
      category({ id: 'b', name: 'Beta', sort_order: 0 }),
      category({ id: 'a', name: 'Alpha', sort_order: 0 }),
    ]

    expect(toTree(tied, 'out').map((node) => node.category.name)).toEqual(['Alpha', 'Beta'])
  })
})

describe('topLevelOf', () => {
  const byId = new Map([
    ['food', category({ id: 'food', name: 'Food' })],
    ['konbini', category({ id: 'konbini', name: 'Konbini', parent_id: 'food' })],
  ])

  it('rolls a child up to its heading', () => {
    expect(topLevelOf('konbini', byId)?.name).toBe('Food')
  })

  it('leaves a heading as itself', () => {
    expect(topLevelOf('food', byId)?.name).toBe('Food')
  })

  it('answers null for money with no category', () => {
    expect(topLevelOf(null, byId)).toBeNull()
  })

  it('answers null for a category it has never seen', () => {
    expect(topLevelOf('gone', byId)).toBeNull()
  })
})
