import { computed } from 'vue'

import { intlLocale } from '@/shared/i18n'
import { formatMoney, formatSigned } from '@/shared/lib/money'
import { useProfile } from './profile.queries'

/**
 * Money formatting bound to the account's currency and the active language.
 *
 * The helpers in `shared/lib/money` take both as parameters so they stay pure;
 * this is the one place that knows where they come from. Everything it returns
 * is a computed, so switching language or currency repaints every amount on
 * screen without a refetch.
 *
 * @example
 * ```ts
 * const money = useMoney()
 * money.format.value(1200)              // '¥1,200'
 * money.signed.value(1200, 'out')       // '−¥1,200'
 * ```
 */
export function useMoney() {
  const { data: profile } = useProfile()

  const currency = computed(() => profile.value?.currency ?? 'JPY')

  return {
    currency,
    format: computed(() => (minor: number) => formatMoney(minor, currency.value, intlLocale.value)),
    signed: computed(
      () => (minor: number, direction: 'in' | 'out') =>
        formatSigned(minor, direction, currency.value, intlLocale.value),
    ),
  }
}
