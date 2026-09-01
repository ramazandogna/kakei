import { describe, expect, it } from 'vitest'

import { foldForSearch } from '../search'

/**
 * One letter has to be enough.
 *
 * The whole point of typing rather than scrolling is that "b" brings up Bakkal
 * before the thumb has moved. That only holds if the fold is forgiving: the app
 * seeds categories called "Yeme içme" and "Ulaşım", and nobody reaches for the
 * ş key while standing at a till.
 */
describe('foldForSearch', () => {
  it('ignores case', () => {
    expect(foldForSearch('Bakkal')).toBe(foldForSearch('bakkal'))
    expect(foldForSearch('KONBİNİ')).toBe(foldForSearch('konbini'))
  })

  it('lets an unaccented spelling find an accented name', () => {
    // Typed quickly, on a keyboard that is not set to Turkish.
    expect(foldForSearch('Ulaşım')).toContain('ulasim')
    expect(foldForSearch('Yeme içme')).toContain('icme')
    expect(foldForSearch('Sağlık')).toContain('saglik')
  })

  it('folds the Turkish dotted capital the way a reader expects', () => {
    // The trap: 'İ'.toLowerCase() is 'i̇' — an i with a combining dot — in most
    // locales, so a naive fold makes "İstanbul" unfindable by "istanbul".
    expect(foldForSearch('İstanbul')).toContain('istanbul')
    expect(foldForSearch('Diğer')).toContain('diger')
  })

  it('leaves scripts without accents alone', () => {
    expect(foldForSearch('食費')).toBe('食費')
    expect(foldForSearch('便利店')).toBe('便利店')
  })

  it('is a substring match, so a middle-of-the-word guess still lands', () => {
    expect(foldForSearch('Supermarket').includes('market')).toBe(true)
  })
})
