import { createTabTransition } from 'rei-kit/app'

import type { AppTab } from '@/shared/types/navigation.types'

/**
 * Tabs in the order they appear in the bottom bar.
 *
 * Single source of truth: the bar renders from this, and slide direction is
 * derived from index distance, so reordering here reorders both.
 */
export const TAB_ORDER = [
  'month',
  'ledger',
  'insights',
  'profile',
] as const satisfies readonly AppTab[]

/** Route path for each tab. */
export const TAB_PATH: Record<AppTab, string> = {
  month: '/',
  ledger: '/ledger',
  insights: '/insights',
  profile: '/profile',
}

/**
 * Which way the screens slide, derived from the order above.
 *
 * The thirty-four lines that did this used to live in `tab-transition.ts`,
 * character for character the same as Hibi's. rei-kit 0.13.0 has them.
 */
export const tabTransition = createTabTransition(TAB_ORDER)
