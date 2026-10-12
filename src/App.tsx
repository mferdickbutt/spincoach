import { useState } from 'react'
import { LocaleProvider, useLocale } from '@/locale/context'
import type { Message } from '@/locale/messages'
import { BattleScreen } from '@/screens/BattleScreen'
import { LaunchScreen } from '@/screens/LaunchScreen'
import { ShoutScreen } from '@/screens/ShoutScreen'
import { StopwatchScreen } from '@/screens/StopwatchScreen'
import { cn } from '@/lib/utils'

const screens = ['launch', 'stopwatch', 'shout', 'battle'] as const
type ScreenId = (typeof screens)[number]

function navMessage(id: ScreenId): Message {
  switch (id) {
    case 'launch':
      return { kind: 'nav-launch' }
    case 'stopwatch':
      return { kind: 'nav-stopwatch' }
    case 'shout':
      return { kind: 'nav-shout' }
    case 'battle':
      return { kind: 'nav-battle' }
    default: {
      const _never: never = id
      return _never
    }
  }
}

function ScreenBody({ id }: { id: ScreenId }) {
  switch (id) {
    case 'launch':
      return <LaunchScreen />
    case 'stopwatch':
      return <StopwatchScreen />
    case 'shout':
      return <ShoutScreen />
    case 'battle':
      return <BattleScreen />
    default: {
      const _never: never = id
      return _never
    }
  }
}

function AppFrame() {
  const { lang, choose, say } = useLocale()
  const [screen, setScreen] = useState<ScreenId>('launch')

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="px-4 pb-2 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Spin<span className="text-primary">Coach</span>
          </h1>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              lang="en"
              aria-pressed={lang === 'en'}
              data-testid="lang-en"
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium',
                lang === 'en' ? 'bg-secondary text-foreground' : 'text-muted-foreground',
              )}
              onClick={() => choose('en')}
            >
              English
            </button>
            <button
              type="button"
              lang="zh-Hant"
              aria-pressed={lang === 'zh-Hant'}
              data-testid="lang-zh-Hant"
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium',
                lang === 'zh-Hant' ? 'bg-secondary text-foreground' : 'text-muted-foreground',
              )}
              onClick={() => choose('zh-Hant')}
            >
              繁體中文
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{say({ kind: 'tagline' })}</p>
      </header>
      <main className="px-4">
        <ScreenBody id={screen} />
        <p className="mt-6 pb-4 text-center text-xs text-muted-foreground">{say({ kind: 'footer' })}</p>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          {screens.map((id) => (
            <button
              key={id}
              type="button"
              className={cn(
                'h-14 flex-1 text-sm font-medium',
                screen === id ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={screen === id ? 'page' : undefined}
              onClick={() => setScreen(id)}
              data-testid={`nav-${id}`}
            >
              {say(navMessage(id))}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <AppFrame />
    </LocaleProvider>
  )
}
