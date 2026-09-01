import { supabase } from '@/shared/lib/supabase'
import { toAppError } from 'rei-kit'

import type { Category, CategoryPatch, NewCategory } from './category.types'

/**
 * Data access for categories.
 *
 * Pure async functions — no Vue, no Pinia, no vue-query. Every function either
 * resolves with data or throws an `AppError`, so callers can use plain
 * try/catch and the whole file is testable without mounting anything.
 */

/** Every active category, both directions, in the user's chosen order. */
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw toAppError(error)
  return data
}

/** Archived categories, most recently archived first. */
export async function listArchivedCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  if (error) throw toAppError(error)
  return data
}

/** Creates a category and returns the stored row, including database defaults. */
export async function createCategory(input: NewCategory): Promise<Category> {
  const { data, error } = await supabase.from('categories').insert(input).select().single()

  if (error) throw toAppError(error)
  return data
}

/** Applies a partial update and returns the updated row. */
export async function updateCategory(id: string, patch: CategoryPatch): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw toAppError(error)
  return data
}

/**
 * Hides a category from the pickers without touching the money that went
 * through it. Reversible.
 *
 * Children are archived with the parent: a child left active under an archived
 * heading has nowhere to appear.
 */
export async function archiveCategory(id: string): Promise<void> {
  const archivedAt = new Date().toISOString()

  const { error } = await supabase
    .from('categories')
    .update({ archived_at: archivedAt })
    .or(`id.eq.${id},parent_id.eq.${id}`)

  if (error) throw toAppError(error)
}

/** Brings an archived category, and anything archived under it, back. */
export async function unarchiveCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ archived_at: null })
    .or(`id.eq.${id},parent_id.eq.${id}`)

  if (error) throw toAppError(error)
}

/**
 * Permanently deletes a category.
 *
 * Its children go with it through `on delete cascade`; the transactions do not
 * — `on delete set null` leaves them in place, uncategorised, because deleting
 * a heading must never delete the money.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) throw toAppError(error)
}

/**
 * Writes a new order for a set of siblings in one atomic call.
 *
 * Delegates to the `reorder_categories` Postgres function: N separate updates
 * could fail halfway and leave the list half-sorted. An upsert cannot stand in
 * for it either — Postgres checks the NOT NULL columns before it discovers the
 * conflict, so a batch of `{ id, sort_order }` rows is rejected outright.
 *
 * @param ids - Category ids in their new order; index becomes `sort_order`.
 */
export async function reorderCategories(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const { error } = await supabase.rpc('reorder_categories', { ids })

  if (error) throw toAppError(error)
}

/**
 * How many transactions a category holds.
 *
 * Used by the delete confirmation, so the user is told exactly how much of
 * their history is about to lose its label instead of a vague "are you sure?".
 */
export async function countCategoryTransactions(id: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (error) throw toAppError(error)
  return count ?? 0
}
