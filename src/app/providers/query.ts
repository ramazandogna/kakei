import { QueryClient } from '@tanstack/vue-query'
import { createQueryDefaults } from 'rei-kit/app'

/**
 * The app's single QueryClient: one cache, one set of defaults.
 *
 * A module-level singleton rather than something built inside a component, so
 * non-Vue code can reach it — the auth store calls `clear()` on sign-out. The
 * defaults are the kit's; both phone apps had arrived at the same four numbers
 * and the reasoning behind them is written down there.
 *
 * @example
 * ```ts
 * // wire it once, in main.ts
 * app.use(VueQueryPlugin, { queryClient })
 *
 * // reach it from anywhere
 * queryClient.invalidateQueries({ queryKey: transactionKeys.lists() })
 * ```
 */
export const queryClient = new QueryClient({ defaultOptions: createQueryDefaults() })
