export const SUPPORTED_LOCALES = ['en', 'ru', 'ko', 'ja'] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]
