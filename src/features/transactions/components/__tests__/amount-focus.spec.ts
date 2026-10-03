import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import TransactionForm from '../TransactionForm.vue'
import { i18n } from '@/shared/i18n'

/**
 * The amount field is where the keyboard goes.
 *
 * This field is why the sheet exists, so the sheet opens with the caret in
 * it and puts it back there when the amount is rejected. It used to be a
 * hand-written `<input>` partly because `BaseInput` could not be focused at
 * all; rei-kit 3.6.0 exposes `focus()`, and swapping to the kit's field also
 * swapped a `role="alert"` message for one wired through
 * `aria-describedby` — read when focus arrives rather than announced where
 * it is.
 *
 * Which makes the order load-bearing, and nothing here covered it: the
 * message has to be rendered *before* the focus lands, or the field is
 * described by an element that does not exist yet and the rejection is
 * announced to nobody. Neither half shows up in a type-check or a snapshot.
 */
vi.mock('@/features/transactions/transactions.queries', () => {
  const idle = () => ({ mutateAsync: vi.fn<() => Promise<void>>(), isPending: { value: false } })
  return {
    useCreateTransaction: idle,
    useUpdateTransaction: idle,
    useDeleteTransaction: idle,
  }
})

vi.mock('@/features/profile/use-money', () => ({
  useMoney: () => ({ currency: { value: 'TRY' } }),
}))

vi.mock('@/features/categories/components/CategoryPicker.vue', () => ({
  default: { name: 'CategoryPicker', template: '<div />' },
}))

/* The form renders three inputs: the direction toggle is a pair of `sr-only`
   radios, so the amount field has to be named rather than taken first. */
const amountField = (wrapper: ReturnType<typeof mountForm>) =>
  wrapper.get<HTMLInputElement>('input[inputmode="decimal"]')

const mountForm = () =>
  mount(TransactionForm, {
    global: { plugins: [i18n], stubs: { Teleport: true } },
    attachTo: document.body,
  })

describe('the amount field', () => {
  it('takes the focus when the form appears', async () => {
    const frame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => (callback(0), 0))

    const wrapper = mountForm()
    await nextTick()

    expect(document.activeElement).toBe(amountField(wrapper).element)

    frame.mockRestore()
    wrapper.unmount()
  })

  it('is described by its message by the time the focus returns to it', async () => {
    const wrapper = mountForm()
    await nextTick()

    const input = amountField(wrapper)

    /* Measured at the moment of the call rather than afterwards. Awaiting a
       tick and then looking proves only that Vue rendered eventually, which
       it always does — the question is whether the description existed when
       the focus arrived, because that is when it is read. */
    let describedAtFocus: string | null = null
    let targetExistedAtFocus = false

    vi.spyOn(input.element, 'focus').mockImplementation(() => {
      describedAtFocus = input.element.getAttribute('aria-describedby')
      targetExistedAtFocus = Boolean(
        describedAtFocus && document.getElementById(describedAtFocus) !== null,
      )
    })

    await wrapper.get('form').trigger('submit')
    await nextTick()

    expect(describedAtFocus).toBeTruthy()
    expect(targetExistedAtFocus).toBe(true)

    wrapper.unmount()
  })
})
