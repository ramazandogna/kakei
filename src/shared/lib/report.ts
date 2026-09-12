import { createWriteReport } from 'rei-kit/app'

import { t } from '@/shared/i18n'

/**
 * Saying that a write happened.
 *
 * The kit's report, with this app's wording. Functions rather than strings, so
 * a language switch is followed rather than frozen at startup.
 *
 * Form validation does **not** come through here: a rejected field says so
 * beside itself, where the eye already is and where it stays until fixed. These
 * are for what has already happened.
 */
const report = createWriteReport({
  saved: () => t('common.saved'),
  deleted: () => t('common.deleted'),
  failed: () => t('common.failed'),
})

export const reportSaved = report.saved
export const reportDeleted = report.deleted
export const reportFailed = report.failed
