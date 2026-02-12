import { computed, ref } from 'vue'
import { LOCALE_LABELS, MESSAGES } from '@/localization/messages'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/localization/types'

const STORAGE_KEY = 'kairo.locale'

function normalizeLocale(value: string | undefined): LocaleCode | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase()
  const exactMatch = SUPPORTED_LOCALES.find((locale) => locale === normalized)
  if (exactMatch) return exactMatch
  const shortMatch = SUPPORTED_LOCALES.find((locale) => normalized.startsWith(`${locale}-`))
  return shortMatch
}

function detectInitialLocale(): LocaleCode {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'en'
  }

  const persisted = normalizeLocale(window.localStorage.getItem(STORAGE_KEY) ?? undefined)
  if (persisted) return persisted

  const browserLocales = navigator.languages.length > 0 ? navigator.languages : [navigator.language]
  for (const browserLocale of browserLocales) {
    const detected = normalizeLocale(browserLocale)
    if (detected) return detected
  }
  return 'en'
}

const localeRef = ref<LocaleCode>(detectInitialLocale())

function setLocale(nextLocale: LocaleCode): void {
  localeRef.value = nextLocale
  window.localStorage.setItem(STORAGE_KEY, nextLocale)
}

function resolvePath(path: string): string | undefined {
  const segments = path.split('.')
  let value: unknown = MESSAGES[localeRef.value]

  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !(segment in value)) {
      value = undefined
      break
    }
    value = (value as Record<string, unknown>)[segment]
  }

  if (typeof value === 'string') return value

  let fallback: unknown = MESSAGES.en
  for (const segment of segments) {
    if (!fallback || typeof fallback !== 'object' || !(segment in fallback)) {
      fallback = undefined
      break
    }
    fallback = (fallback as Record<string, unknown>)[segment]
  }
  return typeof fallback === 'string' ? fallback : path
}

export function useI18n() {
  const locale = computed(() => localeRef.value)
  const availableLocales = SUPPORTED_LOCALES

  function t(path: string): string {
    return resolvePath(path) ?? path
  }

  return {
    locale,
    availableLocales,
    localeLabels: LOCALE_LABELS,
    setLocale,
    t,
  }
}
