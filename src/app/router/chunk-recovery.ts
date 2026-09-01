/**
 * Recovering from a lazy chunk that will not load.
 *
 * Every route in this app is a dynamic import, and the filenames carry a
 * content hash. A tab left open across a deploy is therefore holding an
 * `index.html` that names chunks the server has already replaced: the moment
 * the user changes tab, the import fails and the screen goes blank.
 *
 * Nothing in the app is wrong when this happens, and nothing about the failure
 * is recoverable in place — the code being asked for does not exist any more.
 * The one correct answer is to fetch the page again, which brings the current
 * `index.html` and the chunks that go with it.
 */

/** Where the last recovery attempt is recorded, so one cannot become a loop. */
const RELOAD_KEY = 'kakei-chunk-reload'

/** A second reload inside this window means reloading is not the answer. */
const LOOP_WINDOW_MS = 10_000

/**
 * Whether an error is a lazy chunk that could not be fetched.
 *
 * Matched on the message because no browser gives this a type of its own, and
 * each words it differently: Chrome and Firefox say the import failed, Safari
 * says the script failed, and a server answering a script request with HTML
 * produces the MIME complaint instead.
 *
 * @example
 * ```ts
 * isChunkLoadError(new Error('Failed to fetch dynamically imported module: /a.js'))  // true
 * isChunkLoadError(new TypeError('x is not a function'))                             // false
 * ```
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /'text\/html'/i.test(message) ||
    /expected a javascript(-or-wasm)? module script/i.test(message)
  )
}

/**
 * Decides whether to reload now, and records the attempt.
 *
 * Reloading on a chunk error is right exactly once. If the fresh page fails the
 * same way, the problem is not a stale tab — a broken deploy, an offline
 * device — and reloading again would spin forever in front of someone who
 * cannot read why.
 *
 * @param now - Current time in milliseconds; a parameter so this is testable.
 * @param storage - Where the attempt is recorded. Session-scoped by default, so
 *   the guard expires with the tab.
 * @returns `true` when the caller should reload.
 *
 * @example
 * ```ts
 * shouldReload(Date.now())  // true, then false for the next ten seconds
 * ```
 */
export function shouldReload(
  now: number = Date.now(),
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeSessionStorage(),
): boolean {
  if (!storage) return true

  const previous = Number(storage.getItem(RELOAD_KEY) ?? '0')

  if (Number.isFinite(previous) && previous > 0 && now - previous < LOOP_WINDOW_MS) {
    return false
  }

  storage.setItem(RELOAD_KEY, String(now))

  return true
}

/** `sessionStorage` where it is available, and `null` where it is blocked. */
function safeSessionStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}
