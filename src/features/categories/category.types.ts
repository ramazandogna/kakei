import type { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'

/** Which side of the ledger something belongs to. */
export type Direction = 'in' | 'out'

/** A category row as read from the database. */
export type Category = Tables<'categories'>

/** Fields accepted when creating a category; database defaults stay optional. */
export type NewCategory = TablesInsert<'categories'>

/** Partial fields accepted when updating an existing category. */
export type CategoryPatch = TablesUpdate<'categories'>

/**
 * A parent with the children the picker shows under it.
 *
 * The database stores a flat list with `parent_id`; this is the shape every
 * screen actually wants, built once in `toTree`.
 */
export interface CategoryNode {
  category: Category
  children: Category[]
}
