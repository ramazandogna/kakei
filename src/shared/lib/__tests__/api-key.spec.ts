import { describe, expect, it } from 'vitest'

import { assertPublishableKey, classifyApiKey } from '../api-key'

/**
 * A secret key in `VITE_SUPABASE_ANON_KEY` is the one configuration mistake
 * this app cannot survive: the variable is inlined at build time, so the key
 * becomes a public file, and it bypasses every row-level security policy.
 *
 * It shipped once. These tests are what stop it shipping twice.
 */

/** A legacy key, built here rather than pasted, so no real one is in the repo. */
function legacyKey(role: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    iss: 'supabase',
    ref: 'abcdefghijklmnop',
    role,
    iat: 1_700_000_000,
    exp: 2_000_000_000,
  })}.not-a-real-signature`
}

describe('classifyApiKey', () => {
  it('reads the current key prefixes', () => {
    expect(classifyApiKey('sb_publishable_Ab1-cD2_eF3')).toBe('publishable')
    expect(classifyApiKey('sb_secret_Ab1-cD2_eF3')).toBe('secret')
  })

  it('reads the role claim of a legacy key', () => {
    expect(classifyApiKey(legacyKey('anon'))).toBe('publishable')
    expect(classifyApiKey(legacyKey('service_role'))).toBe('secret')
  })

  it('is not fooled by surrounding whitespace', () => {
    // Pasting from the dashboard routinely brings a newline along.
    expect(classifyApiKey('  sb_secret_abc\n')).toBe('secret')
    expect(classifyApiKey('\nsb_publishable_abc  ')).toBe('publishable')
  })

  it('says so rather than guessing when it cannot tell', () => {
    expect(classifyApiKey('')).toBe('unknown')
    expect(classifyApiKey('not-a-key')).toBe('unknown')
    expect(classifyApiKey('a.b.c')).toBe('unknown')
    expect(classifyApiKey(legacyKey('authenticated'))).toBe('unknown')
  })
})

describe('assertPublishableKey', () => {
  it('lets a publishable key through', () => {
    expect(() => assertPublishableKey('sb_publishable_abc', 'the build')).not.toThrow()
    expect(() => assertPublishableKey(legacyKey('anon'), 'the build')).not.toThrow()
  })

  it('lets an unrecognised key through rather than blocking a valid deploy', () => {
    // Refusing what it does not understand would make a future key format an
    // outage. Only a key it is sure about is rejected.
    expect(() => assertPublishableKey('something-new', 'the build')).not.toThrow()
  })

  it.each([['sb_secret_abc'], [legacyKey('service_role')]])(
    'refuses a secret key, and says what to do about it',
    (key) => {
      // The message is the whole point: it is read by someone whose deploy has
      // just failed, and it has to say what to change, where, and what to do
      // about the key that is already out.
      expect(() => assertPublishableKey(key, 'the build')).toThrow(/SECRET key/)
      expect(() => assertPublishableKey(key, 'the build')).toThrow(/sb_publishable_/)
      expect(() => assertPublishableKey(key, 'the build')).toThrow(/Environment Variables/)
      expect(() => assertPublishableKey(key, 'the build')).toThrow(/\.env\.local/)
      expect(() => assertPublishableKey(key, 'the build')).toThrow(/revoke/)
    },
  )

  it('names where the key would have been exposed', () => {
    expect(() => assertPublishableKey('sb_secret_abc', 'the build')).toThrow(/the build/)
    expect(() => assertPublishableKey('sb_secret_abc', 'this app')).toThrow(/this app/)
  })
})
