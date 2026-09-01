import { describe, expect, it } from 'vitest'
import { formatDate } from 'rei-kit'

import { ensureMessages, intlLocale, t, useLocalePreference } from '../index'
import { formatMoney } from '@/shared/lib/money'

/**
 * The seam between this app and rei-kit.
 *
 * Both halves type-check on their own while being wired to nothing: the runtime
 * is what calls the package's `setFormatLocale`, and if that call were dropped
 * every date would quietly fall back to the browser's language. Nothing else in
 * the suite would notice.
 *
 * Money is checked alongside it because `useMoney` formats through
 * `intlLocale`, which the same runtime owns — a currency in the wrong locale
 * puts the symbol on the wrong side and the separators the wrong way round.
 */
describe('rei-kit wiring', () => {
  it('translates through the app catalogue', () => {
    expect(t('common.close')).toBe('Close')
  })

  it('formats dates and money in the language the app selected', async () => {
    const march = new Date(2026, 2, 14)

    expect(formatDate(march, { month: 'long' })).toBe('March')
    expect(formatMoney(123456, 'JPY', intlLocale.value)).toContain('123,456')

    const preference = useLocalePreference()
    preference.value = 'tr'
    await ensureMessages('tr')
    await Promise.resolve()

    expect(t('common.close')).toBe('Kapat')
    expect(formatDate(march, { month: 'long' })).toBe('Mart')

    // Turkish groups with a dot and puts the symbol last.
    expect(formatMoney(123456, 'JPY', intlLocale.value)).toContain('123.456')
  })
})
