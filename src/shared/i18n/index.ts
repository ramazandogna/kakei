import { createI18nRuntime } from 'rei-kit'

import en from './locales/en'

/** Languages the app ships. `en` is both the default and the fallback. */
export const SUPPORTED_LOCALES = ['en', 'tr', 'ja', 'zh'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export type MessageSchema = typeof en

/**
 * The app's i18n, built on rei-kit's runtime.
 *
 * The catalogue and the locale list stay here because they are Kakei's: typing
 * every locale as `typeof en` is what turns a missing key into a build error,
 * and only this app knows which languages it speaks.
 *
 * Building it through the kit also wires `formatDate` to the chosen language —
 * left to itself it would fall back to the browser's.
 */
const runtime = createI18nRuntime<AppLocale, MessageSchema>({
  locales: SUPPORTED_LOCALES,
  fallback: 'en',
  // Message lookup only needs the base language, but money and dates need a
  // region to be right — `zh` alone would leave the formatter to guess.
  intlTags: { en: 'en-GB', tr: 'tr-TR', ja: 'ja-JP', zh: 'zh-CN' },
  messages: en,
  loaders: {
    tr: () => import('./locales/tr'),
    ja: () => import('./locales/ja'),
    zh: () => import('./locales/zh'),
  },
  storageKey: 'kakei-locale',
})

export const { i18n, t, activeLocale, intlLocale, ensureMessages, loadActiveLocale } = runtime

export type LocalePreference = 'system' | AppLocale

/** Read and write the language preference. */
export const useLocalePreference = runtime.useLocalePreference
