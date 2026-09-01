import { isAuthError } from '@supabase/supabase-js'

/** Supabase error codes this app has wording for, under `authError.*`. */
const KNOWN_CODES = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'email_exists',
  'weak_password',
  'over_request_rate_limit',
  'over_email_send_rate_limit',
  'signup_disabled',
  'user_banned',
] as const

type KnownCode = (typeof KNOWN_CODES)[number]

function isKnown(code: string): code is KnownCode {
  return (KNOWN_CODES as readonly string[]).includes(code)
}

/**
 * Maps an auth failure to a message key.
 *
 * Returns a key rather than a sentence so the caller can translate it at render
 * time — an error stored before a language switch still reads correctly after.
 *
 * @example
 * ```ts
 * serverError.value = toAuthMessageKey(error) // 'authError.invalid_credentials'
 * // <p>{{ $t(serverError) }}</p>
 * ```
 */
export function toAuthMessageKey(error: unknown): string {
  if (isAuthError(error) && error.code && isKnown(error.code)) {
    return `authError.${error.code}`
  }

  return 'authError.generic'
}
