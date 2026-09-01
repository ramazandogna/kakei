import type { Direction } from './category.types'

/** Which slice of the category list a query is showing. */
export type CategoryScope = Direction | 'all' | 'archived'

/**
 * Cache keys for category queries, built as a hierarchy.
 *
 * Every key starts with the parent's key, so vue-query's prefix matching lets
 * you invalidate a whole branch at once instead of listing keys by hand.
 *
 * @example
 * ```ts
 * categoryKeys.all          // ['categories']
 * categoryKeys.lists()      // ['categories', 'list']
 * categoryKeys.list('out')  // ['categories', 'list', 'out']
 * ```
 */
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (scope: CategoryScope) => [...categoryKeys.lists(), scope] as const,
}
