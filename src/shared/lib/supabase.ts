import { createSupabaseClient, setRememberMe } from 'rei-kit/supabase'

import type { Database } from '@/shared/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is missing. Copy .env.example to .env.local and fill it in.')
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing. Copy .env.example to .env.local and fill it in.',
  )
}

/**
 * The app's client.
 *
 * The remember-me storage and the Postgrest error mapping come from
 * rei-kit/supabase; the environment variables stay here, because only the app
 * knows what it calls them.
 */
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)

export { setRememberMe }
