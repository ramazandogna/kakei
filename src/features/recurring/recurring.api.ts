import { supabase } from '@/shared/lib/supabase'
import { toAppError } from 'rei-kit'

import type { Period } from '@/shared/lib/period'
import type {
  NewRecurringEntry,
  PendingRecurring,
  RecurringEntry,
  RecurringPatch,
} from './recurring.types'

/**
 * Data access for fixed monthly entries.
 *
 * A template is not a transaction: nothing reaches the ledger until the user
 * posts it, so a month that went differently is still theirs to correct.
 */

/** Every active template, in the order they fall due. */
export async function listRecurring(): Promise<RecurringEntry[]> {
  const { data, error } = await supabase
    .from('recurring_entries')
    .select('*')
    .is('archived_at', null)
    .order('day_of_month', { ascending: true })

  if (error) throw toAppError(error)
  return data
}

/**
 * The templates with nothing posted against them in this period.
 *
 * Answered by Postgres rather than compared in the browser: the "has this been
 * posted" test is a join, and the day it falls on depends on where the period
 * starts.
 */
export async function fetchPendingRecurring(period: Period): Promise<PendingRecurring[]> {
  const { data, error } = await supabase.rpc('pending_recurring', {
    p_start: period.start,
    p_end: period.end,
  })

  if (error) throw toAppError(error)

  return data as unknown as PendingRecurring[]
}

/** Creates a template. */
export async function createRecurring(input: NewRecurringEntry): Promise<RecurringEntry> {
  const { data, error } = await supabase.from('recurring_entries').insert(input).select().single()

  if (error) throw toAppError(error)
  return data
}

/** Applies a partial update. */
export async function updateRecurring(id: string, patch: RecurringPatch): Promise<RecurringEntry> {
  const { data, error } = await supabase
    .from('recurring_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw toAppError(error)
  return data
}

/**
 * Stops a template without losing what it already posted.
 *
 * Paused rather than deleted: a salary that stops for three months is still the
 * same salary when it comes back, and the transactions it produced keep
 * pointing at it.
 */
export async function archiveRecurring(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_entries')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw toAppError(error)
}

/** Brings a paused template back. */
export async function unarchiveRecurring(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_entries')
    .update({ archived_at: null })
    .eq('id', id)

  if (error) throw toAppError(error)
}

/**
 * Posts pending templates into the ledger, in one request.
 *
 * `recurring_id` is what makes this repeatable-safe: a unique index refuses a
 * second row for the same template on the same day, so a double tap cannot
 * double-charge the month.
 *
 * @param entries - What `fetchPendingRecurring` returned, or a subset of it.
 */
export async function postRecurring(entries: PendingRecurring[]): Promise<number> {
  if (entries.length === 0) return 0

  const rows = entries.map((entry) => ({
    occurred_on: entry.due_on,
    direction: entry.direction,
    amount_minor: entry.amount_minor,
    category_id: entry.category_id,
    necessity: entry.necessity,
    merchant: entry.merchant,
    note: entry.note,
    recurring_id: entry.id,
  }))

  const { data, error } = await supabase.from('transactions').insert(rows).select('id')

  if (error) throw toAppError(error)
  return data.length
}
