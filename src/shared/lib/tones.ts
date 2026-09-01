import type { Tone } from 'rei-kit'

/**
 * The colours a category can wear.
 *
 * A category stores the token name — `'clay'` — and never a hex, so repainting
 * the palette is an edit to `main.css` that reaches every row already written.
 *
 * The class strings are spelled out rather than assembled: Tailwind reads
 * source files as plain text, so `` `bg-tone-${name}` `` would never reach the
 * stylesheet and every dot would come out transparent.
 */
export const CATEGORY_TONES = [
  'indigo',
  'plum',
  'teal',
  'amber',
  'rose',
  'sage',
  'clay',
  'slate',
] as const

export type CategoryTone = (typeof CATEGORY_TONES)[number]

const TONE_CLASSES: Record<CategoryTone, Tone> = {
  indigo: {
    fill: 'bg-tone-indigo',
    card: 'bg-tone-indigo/5 border-tone-indigo/25',
    text: 'text-tone-indigo',
  },
  plum: {
    fill: 'bg-tone-plum',
    card: 'bg-tone-plum/5 border-tone-plum/25',
    text: 'text-tone-plum',
  },
  teal: {
    fill: 'bg-tone-teal',
    card: 'bg-tone-teal/5 border-tone-teal/25',
    text: 'text-tone-teal',
  },
  amber: {
    fill: 'bg-tone-amber',
    card: 'bg-tone-amber/5 border-tone-amber/25',
    text: 'text-tone-amber',
  },
  rose: {
    fill: 'bg-tone-rose',
    card: 'bg-tone-rose/5 border-tone-rose/25',
    text: 'text-tone-rose',
  },
  sage: {
    fill: 'bg-tone-sage',
    card: 'bg-tone-sage/5 border-tone-sage/25',
    text: 'text-tone-sage',
  },
  clay: {
    fill: 'bg-tone-clay',
    card: 'bg-tone-clay/5 border-tone-clay/25',
    text: 'text-tone-clay',
  },
  slate: {
    fill: 'bg-tone-slate',
    card: 'bg-tone-slate/5 border-tone-slate/25',
    text: 'text-tone-slate',
  },
}

/** CSS variables, for the one place classes cannot reach: an SVG `fill`. */
const TONE_VARS: Record<CategoryTone, string> = {
  indigo: 'var(--color-tone-indigo)',
  plum: 'var(--color-tone-plum)',
  teal: 'var(--color-tone-teal)',
  amber: 'var(--color-tone-amber)',
  rose: 'var(--color-tone-rose)',
  sage: 'var(--color-tone-sage)',
  clay: 'var(--color-tone-clay)',
  slate: 'var(--color-tone-slate)',
}

function isTone(value: string | null | undefined): value is CategoryTone {
  return (
    value !== null && value !== undefined && (CATEGORY_TONES as readonly string[]).includes(value)
  )
}

/**
 * The three class strings for a stored tone name.
 *
 * Falls back to `slate` rather than throwing: the column is nullable, and a
 * category with no tone is a category, not an error.
 *
 * @example
 * ```ts
 * toneClasses('clay').fill  // 'bg-tone-clay'
 * toneClasses(null).fill    // 'bg-tone-slate'
 * ```
 */
export function toneClasses(tone: string | null | undefined): Tone {
  return TONE_CLASSES[isTone(tone) ? tone : 'slate']
}

/**
 * The CSS colour for a stored tone name, for SVG fills and strokes.
 *
 * @example
 * ```ts
 * toneColor('rose')  // 'var(--color-tone-rose)'
 * ```
 */
export function toneColor(tone: string | null | undefined): string {
  return TONE_VARS[isTone(tone) ? tone : 'slate']
}
