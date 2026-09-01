/**
 * Normalising a name and a query so one letter is enough to find a category.
 *
 * Typing rather than scrolling only pays off if the match is forgiving. The app
 * seeds categories called "Yeme içme", "Ulaşım" and "Sağlık", and nobody
 * reaches for the ş key while standing at a till.
 *
 * @param value - A category name, or what the user has typed so far.
 * @returns A form suitable for a case- and accent-insensitive substring match.
 *
 * @example
 * ```ts
 * foldForSearch('Ulaşım')   // 'ulasim'
 * foldForSearch('İstanbul') // 'istanbul'
 * foldForSearch('食費')      // '食費' — nothing to fold
 * ```
 */
export function foldForSearch(value: string): string {
  return (
    value
      // Decompose, then drop the combining marks: ş becomes s, ı stays ı.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // The Turkish locale is what makes 'İ' fold to 'i' rather than to an 'i'
      // carrying a combining dot, which no query would ever match.
      .toLocaleLowerCase('tr')
      // 'ı' and 'i' are different letters in Turkish and the same key to
      // someone typing quickly, so they are folded together for searching only.
      .replace(/\u0131/g, 'i')
  )
}
