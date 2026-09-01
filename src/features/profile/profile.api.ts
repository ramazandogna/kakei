import { supabase } from '@/shared/lib/supabase'
import { toAppError } from 'rei-kit'
import type { Profile, ProfilePatch } from './profile.types'
import type { Tables } from '@/shared/types/database.types'

/**
 * Data access for the signed-in user's profile.
 *
 * No id is passed anywhere: RLS restricts both statements to `auth.uid() = id`,
 * so "the only row I can see" is always the right one.
 */

/** The current user's profile row. */
export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').single()

  if (error) throw toAppError(error)
  return data
}

/** Applies a partial update and returns the stored row. */
export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  // PostgREST rejects an UPDATE with no filter, so match every row the policy
  // lets us see — which RLS has already narrowed to this user's single row.
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .not('id', 'is', null)
    .select()
    .single()

  if (error) throw toAppError(error)
  return data
}

/** Everything one account owns, as a single JSON-friendly object. */
export interface ExportBundle {
  exportedAt: string
  profile: Tables<'profiles'> | null
  categories: Tables<'categories'>[]
  transactions: Tables<'transactions'>[]
}

/**
 * Reads every table the user owns, in parallel.
 *
 * No filters are needed: RLS already scopes each query to the signed-in user.
 */
export async function exportEverything(): Promise<ExportBundle> {
  const [profile, categories, transactions] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('transactions').select('*').order('occurred_on'),
  ])

  const failed = [profile, categories, transactions].find((result) => result.error)
  if (failed?.error) throw toAppError(failed.error)

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
  }
}

/**
 * Deletes the user's data, keeping the account itself.
 *
 * Supabase does not let a client delete its own auth user — that needs the
 * service role, which must never reach the browser. Removing the data and
 * saying so plainly is the honest v1 answer.
 *
 * Transactions go first: `on delete set null` means deleting a category would
 * otherwise leave the money behind with no category at all.
 */
export async function deleteAllData(): Promise<void> {
  const transactions = await supabase.from('transactions').delete().not('id', 'is', null)
  if (transactions.error) throw toAppError(transactions.error)

  const categories = await supabase.from('categories').delete().not('id', 'is', null)
  if (categories.error) throw toAppError(categories.error)
}
