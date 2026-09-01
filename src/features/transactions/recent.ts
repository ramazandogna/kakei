import type { Direction } from './transaction.types'

/**
 * What the add sheet remembers between entries.
 *
 * Kept in `localStorage` rather than derived from the ledger: "the categories I
 * use" is a property of this person on this device, and asking the database for
 * it would put a round trip in front of the one screen that has to open
 * instantly. Everything here degrades to a sensible default when storage is
 * blocked.
 */

const DIRECTION_KEY = 'kakei-last-direction'
const RECENT_KEY = 'kakei-recent-categories'

/** How many chips the picker shows before the tree. */
const RECENT_LIMIT = 6

/**
 * The direction the sheet opens on.
 *
 * Defaults to `out`: an expense is what someone standing at a till is entering.
 */
export function readLastDirection(): Direction {
  try {
    return localStorage.getItem(DIRECTION_KEY) === 'in' ? 'in' : 'out'
  } catch {
    return 'out'
  }
}

/** Remembers the direction of the entry that was just saved. */
export function writeLastDirection(direction: Direction): void {
  try {
    localStorage.setItem(DIRECTION_KEY, direction)
  } catch {
    // Storage blocked; the sheet simply opens on `out` next time.
  }
}

type RecentMap = Partial<Record<Direction, string[]>>

function readAll(): RecentMap {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    return parsed as RecentMap
  } catch {
    // Blocked storage, or a value from an older shape. Either way: start over.
    return {}
  }
}

/**
 * Category ids used recently for a direction, most recent first.
 *
 * @example
 * ```ts
 * readRecentCategories('out')  // ['konbini-id', 'rent-id']
 * ```
 */
export function readRecentCategories(direction: Direction): string[] {
  const ids = readAll()[direction]

  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
}

/**
 * Moves a category to the front of its direction's list.
 *
 * @param direction - Which list to write.
 * @param categoryId - The category just used; `null` is ignored.
 */
export function rememberCategory(direction: Direction, categoryId: string | null): void {
  if (!categoryId) return

  const all = readAll()
  const next = [categoryId, ...readRecentCategories(direction).filter((id) => id !== categoryId)]

  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify({ ...all, [direction]: next.slice(0, RECENT_LIMIT) }),
    )
  } catch {
    // Storage blocked; the chips fall back to the top of the tree.
  }
}
