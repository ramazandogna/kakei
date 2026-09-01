import { describe, expect, it } from 'vitest'

import { formatMoney, formatSigned, minorDigits, parseAmount, share } from '../money'

/**
 * Money is where a rounding error becomes a wrong total, so every edge of the
 * parser is pinned down here: this is the one function in the app that turns
 * something a person typed into a number the database keeps forever.
 */

describe('minorDigits', () => {
  it.each([
    ['JPY', 0],
    ['KRW', 0],
    ['EUR', 2],
    ['TRY', 2],
    ['KWD', 3],
  ])('%s has %i minor digits', (currency, digits) => {
    expect(minorDigits(currency)).toBe(digits)
  })

  it('assumes two digits for a currency it does not know', () => {
    expect(minorDigits('XYZ')).toBe(2)
  })

  it('is case-insensitive, because a stored code may not be normalised', () => {
    expect(minorDigits('jpy')).toBe(0)
  })
})

describe('parseAmount', () => {
  it('reads a plain integer', () => {
    expect(parseAmount('980', 'JPY')).toBe(980)
    expect(parseAmount('12', 'EUR')).toBe(1200)
  })

  it('reads both separator conventions as the same number', () => {
    // The point of the function: 1.234,56 and 1,234.56 are one amount to a
    // person, and have to be one amount here.
    expect(parseAmount('1.234,56', 'EUR')).toBe(123456)
    expect(parseAmount('1,234.56', 'EUR')).toBe(123456)
  })

  it('treats three trailing digits as grouping, not as decimals', () => {
    expect(parseAmount('1,234', 'EUR')).toBe(123400)
    expect(parseAmount('1.234', 'EUR')).toBe(123400)
  })

  it('treats three trailing digits as decimals where the currency has three', () => {
    expect(parseAmount('1,234', 'KWD')).toBe(1234)
  })

  it('pads and truncates the fraction to the currency', () => {
    expect(parseAmount('1,5', 'EUR')).toBe(150)
    expect(parseAmount('1,5678', 'EUR')).toBe(156)
    // JPY has no minor unit, so anything after the separator is dropped.
    expect(parseAmount('1500,99', 'JPY')).toBe(1500)
  })

  it('ignores a currency symbol pasted in with the amount', () => {
    expect(parseAmount('¥ 1,200', 'JPY')).toBe(1200)
    expect(parseAmount('€12,50', 'EUR')).toBe(1250)
  })

  it('rejects anything that is not a positive amount', () => {
    expect(parseAmount('', 'EUR')).toBeNull()
    expect(parseAmount('   ', 'EUR')).toBeNull()
    expect(parseAmount('abc', 'EUR')).toBeNull()
    expect(parseAmount('0', 'EUR')).toBeNull()
    expect(parseAmount('0,00', 'EUR')).toBeNull()
    // The minus is not a way to record income: direction is its own control.
    expect(parseAmount('-5', 'EUR')).toBeNull()
  })

  it('rejects an amount too large to stay an exact integer', () => {
    expect(parseAmount('99999999999999999999', 'EUR')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('shows no decimals for a zero-digit currency', () => {
    expect(formatMoney(123456, 'JPY', 'en-GB')).toBe('¥123,456')
  })

  it('shows two decimals for a two-digit currency', () => {
    expect(formatMoney(123456, 'EUR', 'en-GB')).toBe('€1,234.56')
  })

  it('round-trips through the parser', () => {
    const minor = parseAmount('1.234,56', 'EUR')

    expect(minor).toBe(123456)
    expect(formatMoney(minor!, 'EUR', 'en-GB')).toBe('€1,234.56')
  })
})

describe('formatSigned', () => {
  it('marks the direction, with a real minus sign', () => {
    expect(formatSigned(1200, 'in', 'JPY', 'en-GB')).toBe('+¥1,200')
    expect(formatSigned(1200, 'out', 'JPY', 'en-GB')).toBe('−¥1,200')
  })
})

describe('share', () => {
  it('rounds to a whole percent', () => {
    expect(share(2500, 10000)).toBe(25)
    expect(share(1, 3)).toBe(33)
  })

  it('answers 0 rather than NaN for an empty period', () => {
    expect(share(2500, 0)).toBe(0)
    expect(share(0, 0)).toBe(0)
  })
})
