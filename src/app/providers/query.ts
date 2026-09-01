import { QueryClient } from '@tanstack/vue-query'

/**
 * The app's single QueryClient: one cache, one set of defaults.
 *
 * Exported as a module-level singleton (not created inside a component) so
 * non-Vue code can reach it — the auth store calls `clear()` on sign-out.
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
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
})
