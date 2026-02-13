import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('uses browser language on first load and persists override', async () => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['ru-RU', 'en-US'],
    })

    const { useI18n } = await import('@/localization/i18n')
    const i18n = useI18n()

    expect(i18n.locale.value).toBe('ru')
    i18n.setLocale('ja')
    expect(localStorage.getItem('kairo.locale')).toBe('ja')
  })

  it('falls back to english or key when translation is missing', async () => {
    const { useI18n } = await import('@/localization/i18n')
    const i18n = useI18n()
    i18n.setLocale('ko')

    expect(i18n.t('menu.addObject')).toBeTruthy()
    expect(i18n.t('missing.path')).toBe('missing.path')
  })

  it('detects locale from navigator.language when languages is empty', async () => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: [],
    })
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'ja-JP',
    })

    const { useI18n } = await import('@/localization/i18n')
    const i18n = useI18n()
    expect(i18n.locale.value).toBe('ja')
  })

  it('falls back to en when no browser locale matches', async () => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['fr-FR', 'de-DE'],
    })

    const { useI18n } = await import('@/localization/i18n')
    const i18n = useI18n()
    expect(i18n.locale.value).toBe('en')
  })
})
