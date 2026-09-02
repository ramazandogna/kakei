import type { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import type { Direction } from '@/features/categories/category.types'

/** A fixed monthly entry, as stored. */
export type RecurringEntry = Tables<'recurring_entries'>

/** Fields accepted when creating one; database defaults stay optional. */
export type NewRecurringEntry = TablesInsert<'recurring_entries'>

/** Partial update. */
export type RecurringPatch = TablesUpdate<'recurring_entries'>

/**
 * A template that has not been posted into the period on screen yet, with the
 * day it falls on worked out by the database.
 */
export interface PendingRecurring {
  id: string
  direction: Direction
  amount_minor: number
  category_id: string | null
  necessity: string | null
  merchant: string | null
  note: string | null
  day_of_month: number
  /** The day inside this period the entry belongs on, as `YYYY-MM-DD`. */
  due_on: string
}
