import type { Category, CategoryNode, Direction } from './category.types'

/**
 * Turns the flat table into the two levels every screen actually shows.
 *
 * The database stores one row per category with a `parent_id`; the picker, the
 * manager and the donut all want parents in order with their children under
 * them. Built once here rather than three times in three components.
 *
 * A child whose parent is missing — archived while the child was not, say — is
 * promoted to a heading of its own rather than dropped: losing a category
 * silently is how money goes missing from a total.
 *
 * @param categories - Every active category, both directions.
 * @param direction - Which side of the ledger to keep.
 * @returns Parents in `sort_order`, each with its children in `sort_order`.
 *
 * @example
 * ```ts
 * toTree(categories, 'out')
 * // [{ category: Food, children: [Supermarket, Konbini] }, …]
 * ```
 */
export function toTree(categories: Category[], direction: Direction): CategoryNode[] {
  const scoped = categories.filter((category) => category.direction === direction)
  const byId = new Map(scoped.map((category) => [category.id, category]))

  const byOrder = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name)

  const roots = scoped
    .filter((category) => category.parent_id === null || !byId.has(category.parent_id))
    .sort(byOrder)

  const children = new Map<string, Category[]>()

  for (const category of scoped) {
    const parentId = category.parent_id
    if (parentId === null || !byId.has(parentId)) continue

    const siblings = children.get(parentId)
    if (siblings) siblings.push(category)
    else children.set(parentId, [category])
  }

  return roots.map((category) => ({
    category,
    children: (children.get(category.id) ?? []).sort(byOrder),
  }))
}

/**
 * The heading a category rolls up to, for reports grouped by top level.
 *
 * A parent is its own top level, which is what makes the donut's slices add up
 * whether or not a category has children.
 *
 * @param id - Category id, or `null` for money whose category was deleted.
 * @param byId - Every category, keyed by id.
 * @returns The top-level category, or `null` when there is none.
 *
 * @example
 * ```ts
 * topLevelOf(konbini.id, byId)  // Food
 * topLevelOf(food.id, byId)     // Food
 * topLevelOf(null, byId)        // null
 * ```
 */
export function topLevelOf(
  id: string | null,
  byId: ReadonlyMap<string, Category>,
): Category | null {
  if (id === null) return null

  const category = byId.get(id)
  if (!category) return null

  if (category.parent_id === null) return category

  return byId.get(category.parent_id) ?? category
}
