import { describe, expect, it } from 'vitest'

import { readOAuthReturn } from '../oauth-return'

/**
 * Reading the fragment is the only way to tell a refused sign-in from a plain
 * visit to the login screen: `getSession()` reports no session and no error of
 * its own in both cases.
 */
describe('readOAuthReturn', () => {
  it('recognises a successful hand-back', () => {
    expect(
      readOAuthReturn('https://app/#access_token=eyJ&refresh_token=v1&token_type=bearer'),
    ).toEqual({ kind: 'tokens' })
  })

  it("recognises a refusal, and carries the provider's own wording", () => {
    expect(
      readOAuthReturn('https://app/#error=access_denied&error_description=You%20said%20no'),
    ).toEqual({ kind: 'error', description: 'You said no' })
  })

  it('falls back to the error code when there is no description', () => {
    expect(readOAuthReturn('https://app/#error=server_error')).toEqual({
      kind: 'error',
      description: 'server_error',
    })
  })

  it('treats an error_code with no error as a failure too', () => {
    expect(readOAuthReturn('https://app/#error_code=otp_expired').kind).toBe('error')
  })

  it('says nothing happened for an ordinary URL', () => {
    expect(readOAuthReturn('https://app/ledger?direction=out')).toEqual({ kind: 'none' })
    expect(readOAuthReturn('https://app/#')).toEqual({ kind: 'none' })
    expect(readOAuthReturn('https://app/#section')).toEqual({ kind: 'none' })
  })
})
