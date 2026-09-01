/**
 * What Supabase leaves in the URL when it hands the browser back.
 *
 * The implicit flow returns the tokens in the fragment
 * (`#access_token=…&refresh_token=…`) and a refusal as
 * `#error=access_denied&error_description=…`. Both have to be read before
 * anything else touches the URL: on success `auth-js` strips the fragment
 * itself, so a later read finds nothing and cannot tell a failed sign-in from a
 * plain visit to the page.
 */

/** What the URL says about the sign-in that just happened. */
export type OAuthReturn =
  { kind: 'none' } | { kind: 'tokens' } | { kind: 'error'; description: string }

/**
 * Reads the OAuth artefacts out of the current URL without consuming them.
 *
 * @param href - Defaults to the live location; a parameter so this is testable
 *   without a browser.
 *
 * @example
 * ```ts
 * readOAuthReturn('https://app/#access_token=x&refresh_token=y')
 * // { kind: 'tokens' }
 * readOAuthReturn('https://app/#error=access_denied&error_description=Nope')
 * // { kind: 'error', description: 'Nope' }
 * ```
 */
export function readOAuthReturn(href: string = window.location.href): OAuthReturn {
  const hash = href.slice(href.indexOf('#') + 1)
  if (!href.includes('#') || hash === '') return { kind: 'none' }

  const params = new URLSearchParams(hash)

  if (params.has('error') || params.has('error_description') || params.has('error_code')) {
    return {
      kind: 'error',
      description: params.get('error_description') ?? params.get('error') ?? '',
    }
  }

  return params.has('access_token') ? { kind: 'tokens' } : { kind: 'none' }
}

/**
 * Takes the fragment off the address bar, in place.
 *
 * `auth-js` does this itself when it accepts the tokens. This is for the other
 * path: when it rejects them the fragment stays, so a live access token sits in
 * the address bar for anyone to read over a shoulder, and rides along into the
 * next link the user shares.
 *
 * `replaceState` rather than assigning `location.hash`, which would push a
 * history entry and let Back walk straight into the tokens again.
 */
export function clearOAuthReturn(): void {
  if (typeof window === 'undefined' || window.location.hash === '') return

  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  )
}
