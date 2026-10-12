import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSeconds } from '@/lib/format'
import { useLocale } from '@/locale/context'
import type { BattleNotice } from '@/locale/messages'
import { loadWins, saveWins, type BattleWins } from '@/store/battle'
import { cn } from '@/lib/utils'

export function BattleScreen() {
  const { say } = useLocale()
  const [wins, setWins] = useState<BattleWins>(() => loadWins())
  const [t1, setT1] = useState('0.00')
  const [t2, setT2] = useState('0.00')
  const [result, setResult] = useState<BattleNotice | null>(null)
  const [winner, setWinner] = useState<-1 | 0 | 1 | null>(null)
  const [live, setLive] = useState(false)
  const started = useRef(0)
  const ended = useRef<[number | null, number | null]>([null, null])
  const raf = useRef(0)

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current)
  }, [])

  function tick() {
    const elapsed = performance.now() - started.current
    if (ended.current[0] === null) {
      setT1(formatSeconds(elapsed))
    }
    if (ended.current[1] === null) {
      setT2(formatSeconds(elapsed))
    }
    raf.current = requestAnimationFrame(tick)
  }

  function stop(i: 0 | 1) {
    if (!live || ended.current[i] !== null) {
      return
    }
    const elapsed = performance.now() - started.current
    ended.current[i] = elapsed
    if (i === 0) {
      setT1(formatSeconds(elapsed))
    } else {
      setT2(formatSeconds(elapsed))
    }
    if (ended.current[0] !== null && ended.current[1] !== null) {
      cancelAnimationFrame(raf.current)
      setLive(false)
      const a = ended.current[0]
      const b = ended.current[1]
      if (a === b) {
        setWinner(-1)
        setResult({ kind: 'battle-draw' })
        return
      }
      const player = a > b ? 1 : 2
      setWinner(player === 1 ? 0 : 1)
      setResult({ kind: 'battle-win', player, marginMs: Math.abs(a - b) })
      const next: BattleWins = [wins[0], wins[1]]
      if (player === 1) {
        next[0] += 1
      } else {
        next[1] += 1
      }
      saveWins(next)
      setWins(next)
    }
  }

  function start() {
    ended.current = [null, null]
    setResult(null)
    setWinner(null)
    started.current = performance.now()
    setLive(true)
    setT1('0.00')
    setT2('0.00')
    raf.current = requestAnimationFrame(tick)
  }

  function resetScore(event: MouseEvent) {
    event.preventDefault()
    saveWins([0, 0])
    setWins([0, 0])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{say({ kind: 'battle-title' })}</CardTitle>
        <CardDescription>{say({ kind: 'battle-description' })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn('rounded-xl bg-secondary p-3 text-center', winner === 0 && 'ring-2 ring-primary')}
            data-testid="p1"
          >
            <p className="text-sm font-medium">{say({ kind: 'player-label', player: 1 })}</p>
            <p className="my-2 text-4xl font-extrabold tabular-nums" data-testid="t1">
              {t1}
            </p>
            <Button className="w-full" size="lg" onClick={() => stop(0)} data-testid="s1">
              {say({ kind: 'action-stop' })}
            </Button>
          </div>
          <div
            className={cn('rounded-xl bg-secondary p-3 text-center', winner === 1 && 'ring-2 ring-primary')}
            data-testid="p2"
          >
            <p className="text-sm font-medium">{say({ kind: 'player-label', player: 2 })}</p>
            <p className="my-2 text-4xl font-extrabold tabular-nums" data-testid="t2">
              {t2}
            </p>
            <Button className="w-full" size="lg" onClick={() => stop(1)} data-testid="s2">
              {say({ kind: 'action-stop' })}
            </Button>
          </div>
        </div>
        <Button className="w-full" size="lg" onClick={start} disabled={live} data-testid="duo-go">
          {say({ kind: 'action-start-battle' })}
        </Button>
        <p className="text-center font-medium" data-testid="duo-res">
          {result ? say(result) : ''}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {say({ kind: 'score', p1: wins[0], p2: wins[1] })}{' '}
          <button type="button" className="underline" onClick={resetScore} data-testid="duo-clr">
            {say({ kind: 'action-reset' })}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}
