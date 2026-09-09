import { useToast } from 'rei-kit'

import { t } from '@/shared/i18n'

/**
 * Saying that a write happened.
 *
 * Here rather than at each call site so every mutation reports the same way:
 * before this, none of them reported at all — a transaction was added, a
 * category was deleted, and the only evidence was that nothing had visibly
 * broken.
 *
 * Deliberately generic. A message naming the thing that was saved reads better
 * once and worse every time after, and a ledger is a screen somebody uses
 * dozens of times in a sitting.
 *
 * Form validation does **not** come through here: a rejected field says so
 * beside itself, where the eye already is and where it stays until fixed.
 * These are for what has already happened.
 */
export function reportSaved(): void {
  useToast().success(t('common.saved'))
}

export function reportDeleted(): void {
  useToast().success(t('common.deleted'))
}

/**
 * A write that did not land.
 *
 * `danger` rather than `warning`: the user's change is not in the database and
 * they are the only one who can decide what to do about it.
 */
export function reportFailed(): void {
  useToast().danger(t('common.failed'))
}
