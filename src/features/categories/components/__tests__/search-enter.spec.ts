import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import CategoryPicker from '../CategoryPicker.vue'
import { i18n } from '@/shared/i18n'
import type { Category } from '../../category.types'

/**
 * Enter still picks the first match.
 *
 * The search row used to be a hand-written `<input>` with the listener bound
 * straight to it. It is `BaseInput` now — adopted because rei-kit 3.1.0 gave
 * the field a `#prefix` slot, which is what the hand-written row existed for
 * — and that puts the listener through the component's fallthrough
 * attributes instead. It still reaches the control, and this is the only
 * thing that says so: a listener that quietly stops arriving leaves a search
 * box that looks right and does nothing on Enter.
 *
 * The swap also raised the text from `text-sm` to the kit's 16px floor,
 * which is not cosmetic: iOS zooms the viewport when it focuses anything
 * smaller and never zooms back.
 */
const CATEGORIES: Category[] = [
  { id: 'a', name: 'Groceries', direction: 'out', parent_id: null } as Category,
  { id: 'b', name: 'Transport', direction: 'out', parent_id: null } as Category,
]

vi.mock('../../categories.queries', () => ({
  useCategories: () => ({ data: ref(CATEGORIES) }),
  useCategoryTree: () => ({
    tree: ref(CATEGORIES.map((category) => ({ category, children: [] }))),
  }),
  useCreateCategory: () => ({ mutateAsync: vi.fn<() => Promise<void>>(), isPending: ref(false) }),
}))

vi.mock('@/features/transactions/recent', () => ({ readRecentCategories: () => [] }))

const mountPicker = () =>
  mount(CategoryPicker, {
    props: { direction: 'out' as const, modelValue: null },
    global: { plugins: [i18n] },
  })

describe('the category search', () => {
  it('hands Enter to the component that owns the list', async () => {
    const wrapper = mountPicker()
    const search = wrapper.get('input[type="search"]')

    await search.setValue('trans')
    await nextTick()
    await search.trigger('keydown.enter')
    await nextTick()

    /* The listener arrived and the one match was chosen. */
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
  })

  it('types into a field that will not zoom iOS on focus', () => {
    const classes = mountPicker().get('input[type="search"]').classes()

    /* 16px or more. `text-sm` is 14, which is what the hand-written row had
       and why this is worth asserting rather than assuming. */
    expect(classes).not.toContain('text-sm')
    expect(classes).toContain('text-base')
  })
})
