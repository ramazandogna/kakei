import { describe, expect, it } from 'vitest'

import { toRedirectPath } from '../guards'

/**
 * The fragment must never reach the query string.
 *
 * Supabase's implicit OAuth flow hands the browser back with the access and
 * refresh tokens in the URL fragment, and a fragment is client-side only — it
 * is never sent to a server. Copying it into `?redirect=` stops that being
 * true: the next request carries the token to the host, which writes it to an
 * access log. This shipped once, which is why it is tested rather than
 * remembered.
 */
describe('toRedirectPath', () => {
  it('keeps the path and the query', () => {
    expect(toRedirectPath({ fullPath: '/ledger?direction=out&q=konbini' })).toBe(
      '/ledger?direction=out&q=konbini',
    )
  })

  it('drops an OAuth fragment rather than carrying the tokens along', () => {
    const path = toRedirectPath({
      fullPath: '/#access_token=eyJhbGci&refresh_token=v1.abc&token_type=bearer',
    })

    expect(path).toBe('/')
    expect(path).not.toContain('access_token')
    expect(path).not.toContain('refresh_token')
  })

  it('drops a fragment while keeping the query in front of it', () => {
    expect(toRedirectPath({ fullPath: '/ledger?direction=out#access_token=x' })).toBe(
      '/ledger?direction=out',
    )
  })

  it('drops an ordinary fragment too — there is nothing to return to in one', () => {
    expect(toRedirectPath({ fullPath: '/insights#share' })).toBe('/insights')
  })

  it('never returns an empty path', () => {
    expect(toRedirectPath({ fullPath: '#access_token=x' })).toBe('/')
    expect(toRedirectPath({ fullPath: '' })).toBe('/')
  })
})
