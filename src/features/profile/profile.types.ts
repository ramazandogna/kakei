import type { Tables, TablesUpdate } from '@/shared/types/database.types'

/** The current user's preferences row, created by the signup trigger. */
export type Profile = Tables<'profiles'>

/** Partial preferences update. */
export type ProfilePatch = TablesUpdate<'profiles'>
