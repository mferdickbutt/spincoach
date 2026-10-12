import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { chooseLang, readLang, type Lang } from '@/locale/lang'
import { say as renderMessage, type Message } from '@/locale/messages'

export type LocaleApi = {
  lang: Lang
  choose: (next: Lang) => void
  say: (message: Message) => string
}

const LocaleContext = createContext<LocaleApi | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }): ReactNode {
  const [lang, setLang] = useState(readLang)
  const api = useMemo<LocaleApi>(
    () => ({
      lang,
      choose(next) {
        chooseLang(next)
        setLang(next)
      },
      say(message) {
        return renderMessage(lang, message)
      },
    }),
    [lang],
  )
  return <LocaleContext.Provider value={api}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleApi {
  const api = useContext(LocaleContext)
  if (!api) {
    throw new Error('useLocale requires LocaleProvider')
  }
  return api
}
