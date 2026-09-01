/**
 * Money, held as an integer number of minor units.
 *
 * Nothing here does arithmetic on a decimal. `0.1 + 0.2` is not `0.3` in
 * binary floating point, and a ledger that is out by a hundredth is a ledger
 * nobody trusts. Amounts are parsed at the edge, stored as `bigint` minor
 * units, and formatted again on the way out.
 */

/**
 * Currencies whose minor unit is not two digits.
 *
 * The default is 2, which is right for the overwhelming majority. These are the
 * ones this app is likely to meet that are not.
 */
const MINOR_DIGITS: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
}

/** Currencies offered in Settings, in the order they are listed. */
export const SUPPORTED_CURRENCIES = ['JPY', 'TRY', 'EUR', 'USD', 'GBP'] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

/**
 * How many digits sit after the decimal separator for a currency.
 *
 * @param currency - ISO 4217 code, e.g. `'JPY'`.
 * @returns 0, 2 or 3.
 *
 * @example
 * ```ts
 * minorDigits('JPY')  // 0
 * minorDigits('EUR')  // 2
 * ```
 */
export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency.toUpperCase()] ?? 2
}

/**
 * Formats minor units as money in the given locale.
 *
 * The locale is a parameter rather than read from a module singleton, so the
 * function stays pure and a component can recompute it when the language
 * changes.
 *
 * @param minor - Amount in minor units. Always an integer.
 * @param currency - ISO 4217 code.
 * @param locale - BCP 47 tag, e.g. `'ja-JP'`.
 *
 * @example
 * ```ts
 * formatMoney(123456, 'JPY', 'ja-JP')  // '￥123,456'
 * formatMoney(123456, 'EUR', 'tr-TR')  // '€1.234,56'
 * ```
 */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const digits = minorDigits(currency)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // 'JP¥' is what `symbol` gives an English locale, and it reads as noise in
    // a column of amounts. One ledger holds one currency, so the short form can
    // never be ambiguous here.
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits)
}

/**
 * The same, with an explicit sign — `+` for money in, `−` for money out.
 *
 * Uses U+2212 MINUS SIGN rather than a hyphen: at the size these are read, a
 * hyphen next to a digit is barely visible.
 *
 * @param minor - Amount in minor units, always positive.
 * @param direction - `'in'` or `'out'`.
 *
 * @example
 * ```ts
 * formatSigned(1200, 'out', 'JPY', 'en-GB')  // '−¥1,200'
 * ```
 */
export function formatSigned(
  minor: number,
  direction: 'in' | 'out',
  currency: string,
  locale: string,
): string {
  return `${direction === 'in' ? '+' : '−'}${formatMoney(minor, currency, locale)}`
}

/**
 * Parses what someone typed into minor units.
 *
 * Accepts both separators in either role — `1.234,56` and `1,234.56` are the
 * same number to a person and have to be the same number here. The rule is that
 * the *last* separator with the right number of digits after it is the decimal
 * one; everything else is grouping.
 *
 * @param input - Raw field value.
 * @param currency - Decides how many minor digits are kept.
 * @returns Minor units, or `null` when the input is not a positive amount.
 *
 * @example
 * ```ts
 * parseAmount('1.234,56', 'EUR')  // 123456
 * parseAmount('1,234.56', 'EUR')  // 123456
 * parseAmount('980', 'JPY')       // 980
 * parseAmount('-5', 'EUR')        // null — direction is a separate control
 * ```
 */
export function parseAmount(input: string, currency: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  // A minus is not a way to record income, and guessing which way it was meant
  // is worse than asking again: the sheet has a direction control above this
  // field, and a dropped sign would file the entry on the wrong side.
  if (/[-−]/.test(trimmed)) return null

  // Anything that is not a digit or a separator is not part of the number. A
  // stray currency symbol pasted in with the amount should not fail the parse.
  const cleaned = trimmed.replace(/[^\d.,]/g, '')
  if (cleaned === '') return null

  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','))

  let whole = cleaned
  let fraction = ''

  if (lastSeparator !== -1) {
    const after = cleaned.slice(lastSeparator + 1)

    // Three digits after the last separator is grouping ('1,234'), not a
    // decimal — unless the currency actually has three minor digits.
    const isDecimal = after.length !== 3 || minorDigits(currency) === 3

    if (isDecimal) {
      whole = cleaned.slice(0, lastSeparator)
      fraction = after
    }
  }

  whole = whole.replace(/[.,]/g, '')
  if (whole === '' && fraction === '') return null
  if (/\D/.test(whole) || /\D/.test(fraction)) return null

  const digits = minorDigits(currency)
  const scaled = `${whole || '0'}${fraction.padEnd(digits, '0').slice(0, digits)}`
  const minor = Number(scaled)

  if (!Number.isSafeInteger(minor) || minor <= 0) return null

  return minor
}

/**
 * A share as a whole percentage, guarding the empty month.
 *
 * @param part - Numerator in minor units.
 * @param total - Denominator in minor units.
 * @returns 0 when the total is 0, rather than `NaN`.
 *
 * @example
 * ```ts
 * share(2500, 10000)  // 25
 * share(2500, 0)      // 0
 * ```
 */
export function share(part: number, total: number): number {
  if (total <= 0) return 0

  return Math.round((part / total) * 100)
}
