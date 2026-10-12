import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatSeconds, formatWhen } from '@/lib/format'
import { useLocale } from '@/locale/context'
import { readLang } from '@/locale/lang'
import { appendSpin, bestSpin, loadSpins, type SpinRecord } from '@/store/stopwatch'

export function StopwatchScreen() {
  const { say } = useLocale()
  const [spins, setSpins] = useState<SpinRecord[]>(() => loadSpins())
  const [display, setDisplay] = useState('0.00')
  const [running, setRunning] = useState(false)
  const started = useRef(0)
  const raf = useRef(0)
  const best = bestSpin(spins)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(raf.current)
    }
  }, [])

  function tick() {
    setDisplay(formatSeconds(performance.now() - started.current))
    raf.current = requestAnimationFrame(tick)
  }

  function toggle() {
    if (!running) {
      started.current = performance.now()
      setRunning(true)
      raf.current = requestAnimationFrame(tick)
      return
    }
    cancelAnimationFrame(raf.current)
    const elapsed = performance.now() - started.current
    setRunning(false)
    setDisplay(formatSeconds(elapsed))
    setSpins(appendSpin({ v: elapsed, at: formatWhen(readLang()) }))
  }

  function reset() {
    cancelAnimationFrame(raf.current)
    setRunning(false)
    started.current = 0
    setDisplay('0.00')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{say({ kind: 'stopwatch-title' })}</CardTitle>
        <CardDescription>{say({ kind: 'stopwatch-description' })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-6xl font-extrabold tabular-nums" data-testid="sw-value">
          {display}
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" onClick={toggle} data-testid="sw-go">
            {running ? say({ kind: 'action-stop' }) : say({ kind: 'action-start' })}
          </Button>
          <Button className="flex-1" size="lg" variant="secondary" onClick={reset} data-testid="sw-reset">
            {say({ kind: 'action-reset' })}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {best === null ? say({ kind: 'best-spin-empty' }) : say({ kind: 'best-spin', ms: best })}
        </p>
        <ul className="text-sm text-muted-foreground" data-testid="sw-hist">
          {spins.slice(0, 8).map((row) => (
            <li key={`${row.at}-${row.v}`} className="flex justify-between border-t border-border py-2">
              <span>{row.at}</span>
              <span className="font-medium text-foreground">{say({ kind: 'seconds', ms: row.v })}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
