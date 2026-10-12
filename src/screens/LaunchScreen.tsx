import { useEffect, useRef, useState } from 'react'
import { bluetoothAvailability } from '@/ble/availability'
import { BattlePassConnection, ConnectFailed, type RawNotify } from '@/ble/connect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useLocale } from '@/locale/context'
import {
  formatLogClock,
  type LaunchNotice,
  type LogNotice,
  type LogRow,
  type StatusNotice,
} from '@/locale/messages'
import { cancelLaunchMotion, runLaunchMotion } from '@/lib/motion'
import { createPassSession, type DomainEvent, type PassSession } from '@/protocol'
import {
  appendFresh,
  bestSp,
  loadBbpKey,
  loadLaunches,
  saveBbpKey,
  type FreshSource,
  type LaunchRecord,
} from '@/store/launches'

function initialStatus(): StatusNotice {
  const avail = bluetoothAvailability()
  return avail.ok ? { kind: 'not-connected' } : { kind: 'blocked', block: avail.block }
}

export function LaunchScreen() {
  const { lang, say } = useLocale()
  const [launches, setLaunches] = useState<LaunchRecord[]>(() => loadLaunches())
  const [sp, setSp] = useState(0)
  const [mode, setMode] = useState<LaunchNotice | null>(null)
  const [status, setStatus] = useState<StatusNotice>(initialStatus)
  const [log, setLog] = useState<LogRow[]>([])
  const [connected, setConnected] = useState(false)
  const conn = useRef(new BattlePassConnection())
  const session = useRef<PassSession | null>(null)
  const logRef = useRef<HTMLPreElement>(null)
  const best = bestSp(launches)
  const logText = log.map((row) => `${formatLogClock(lang, row.at)}  ${say(row.line)}`).join('\n')

  function pushLog(line: LogNotice) {
    setLog((prev) => {
      const next = [...prev, { at: Date.now(), line }]
      return next.length > 400 ? next.slice(-400) : next
    })
  }

  useEffect(() => {
    const el = logRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [log])

  useEffect(() => {
    const connection = conn.current
    return () => {
      cancelLaunchMotion()
      connection.disconnect()
    }
  }, [])

  function record(value: number, source: FreshSource) {
    setSp(value)
    setLaunches(appendFresh(value, source))
  }

  function startMotion() {
    setSp(0)
    runLaunchMotion({
      onListening: (seconds) => setMode({ kind: 'motion-window', seconds }),
      onLiveSp: setSp,
      onVerdict: (verdict) => {
        switch (verdict.kind) {
          case 'recorded':
            record(verdict.sp, 'motion')
            setMode({ kind: 'motion-recorded' })
            return
          case 'missing':
            setMode({
              kind: 'motion-missing',
              battlePassHere: bluetoothAvailability().ok,
            })
            return
          case 'denied':
            setMode({
              kind: 'motion-denied',
              battlePassHere: bluetoothAvailability().ok,
            })
            return
          case 'silent':
            setMode({ kind: 'motion-silent' })
            return
          case 'still':
            setMode({ kind: 'motion-still' })
            return
          default: {
            const _never: never = verdict
            return _never
          }
        }
      },
    })
  }

  function onNotify(packet: RawNotify) {
    pushLog({
      kind: 'packet',
      uuidPrefix: packet.characteristicUuid.slice(0, 8),
      hex: packet.hex,
    })
    if (!session.current) {
      return
    }
    const events = session.current.ingest(packet.bytes)
    for (const event of events) {
      handleEvent(event)
    }
  }

  function handleEvent(event: DomainEvent) {
    switch (event.type) {
      case 'status': {
        const next = event.status
        setStatus({
          kind: 'pass-status',
          attach: next.attach.kind,
          batteryPercent: Math.round(next.batteryPercent),
          deviceBestSp: next.deviceBestSp,
        })
        return
      }
      case 'shot': {
        const key = session.current?.peekLastKey()
        if (key) {
          saveBbpKey(key)
        }
        switch (event.decision.action) {
          case 'log':
            record(event.shot.sp, 'bbp')
            setMode({ kind: 'bbp-launch', sp: event.shot.sp })
            return
          case 'skip-duplicate':
            pushLog({ kind: 'skip-duplicate', sp: event.shot.sp })
            setSp(event.shot.sp)
            return
          case 'skip-initial-sync':
            pushLog({ kind: 'skip-initial-sync', sp: event.shot.sp })
            setSp(event.shot.sp)
            return
          default: {
            const _never: never = event.decision
            return _never
          }
        }
      }
      case 'error':
        pushLog({ kind: 'protocol', code: event.error.code })
        return
      case 'unknown':
        pushLog({ kind: 'unknown-packet', header: event.header, hex: event.hex })
        return
      case 'curve':
        return
      default: {
        const _never: never = event
        return _never
      }
    }
  }

  function disconnect() {
    conn.current.disconnect()
    setConnected(false)
    setStatus({ kind: 'link', event: { kind: 'disconnected' } })
  }

  async function connect(discovery: boolean) {
    const avail = bluetoothAvailability()
    if (!avail.ok) {
      setStatus({ kind: 'blocked', block: avail.block })
      return
    }
    try {
      session.current = createPassSession({ lastKey: loadBbpKey() })
      await conn.current.connect(
        discovery,
        onNotify,
        (event) => {
          const line = { kind: 'link' as const, event }
          setStatus(line)
          pushLog(line)
        },
        () => {
          setConnected(false)
        },
      )
      setConnected(true)
    } catch (err) {
      if (err instanceof ConnectFailed) {
        setStatus({ kind: 'gatt-failed' })
        pushLog({ kind: 'gatt-failed' })
        return
      }
      const errorName = err instanceof Error ? err.name : 'Error'
      const message = err instanceof Error ? err.message : String(err)
      if (errorName === 'NotFoundError') {
        setStatus({ kind: 'no-device' })
      } else {
        setStatus({ kind: 'bt-error', message })
      }
      pushLog({ kind: 'caught', errorName, message })
    }
  }

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(logText)
      pushLog({ kind: 'log-copied' })
    } catch {
      pushLog({ kind: 'copy-failed' })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{say({ kind: 'launch-title' })}</CardTitle>
          <CardDescription>{say({ kind: 'launch-description' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-6xl font-extrabold tabular-nums tracking-tight" data-testid="sp-value">
            {sp}
          </p>
          <Progress value={Math.min(100, sp / 100)} className="h-3" />
          <p className="text-center text-sm text-muted-foreground" data-testid="sp-mode">
            {mode ? say(mode) : ''}
          </p>
          <Button className="w-full" size="lg" onClick={startMotion} data-testid="sp-start">
            {say({ kind: 'action-start-motion' })}
          </Button>
          <p className="text-sm text-muted-foreground">{say({ kind: 'best-sp', sp: best })}</p>
          <ul className="text-sm text-muted-foreground" data-testid="sp-hist">
            {launches.slice(0, 8).map((row) => (
              <li
                key={`${row.at}-${row.sp}-${row.source}`}
                className="flex justify-between border-t border-border py-2"
              >
                <span>{row.at}</span>
                <span className="font-medium text-foreground">
                  {say({ kind: 'history-cell', sp: row.sp, source: row.source })}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{say({ kind: 'bbp-title' })}</CardTitle>
          <CardDescription>{say({ kind: 'bbp-description' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => {
                if (connected) {
                  disconnect()
                  return
                }
                void connect(false)
              }}
              data-testid="bbp-connect"
            >
              {connected ? say({ kind: 'action-disconnect' }) : say({ kind: 'action-connect' })}
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="secondary"
              onClick={() => void connect(true)}
              data-testid="bbp-discover"
            >
              {say({ kind: 'action-discovery' })}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="bbp-status">
            {say(status)}
          </p>
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              {say({ kind: 'log-summary' })}
            </summary>
            <pre
              ref={logRef}
              data-testid="bbp-log"
              className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground"
            >
              {logText}
            </pre>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => void copyLog()}>
              {say({ kind: 'action-copy-log' })}
            </Button>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}
