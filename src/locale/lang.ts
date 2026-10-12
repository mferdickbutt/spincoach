import { loadJson, saveJson } from '@/lib/storage'

export type Lang = 'en' | 'zh-Hant'

export function parseLang(raw: unknown): Lang {
  return raw === 'zh-Hant' ? 'zh-Hant' : 'en'
}

export function readLang(): Lang {
  return parseLang(loadJson<unknown>('lang', null))
}

export function applyDocumentLang(lang: Lang): void {
  document.documentElement.lang = lang
}

export function chooseLang(lang: Lang): void {
  saveJson('lang', lang)
  applyDocumentLang(lang)
}
