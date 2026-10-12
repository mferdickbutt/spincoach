import type { BtBlock } from '@/ble/availability'
import type { LinkEvent } from '@/ble/connect'
import { formatSeconds } from '@/lib/format'
import type { Lang } from '@/locale/lang'
import type { PassStatus } from '@/protocol'
import type { LoadedSource } from '@/store/launches'

type AttachKind = PassStatus['attach']['kind']

export type Message =
  | { kind: 'tagline' }
  | { kind: 'footer' }
  | { kind: 'nav-launch' }
  | { kind: 'nav-stopwatch' }
  | { kind: 'nav-shout' }
  | { kind: 'nav-battle' }
  | { kind: 'launch-title' }
  | { kind: 'launch-description' }
  | { kind: 'action-start-motion' }
  | { kind: 'motion-window'; seconds: number }
  | { kind: 'motion-recorded' }
  | { kind: 'motion-missing'; battlePassHere: boolean }
  | { kind: 'motion-denied'; battlePassHere: boolean }
  | { kind: 'motion-silent' }
  | { kind: 'motion-still' }
  | { kind: 'bbp-launch'; sp: number }
  | { kind: 'history-cell'; sp: number; source: LoadedSource }
  | { kind: 'best-sp'; sp: number }
  | { kind: 'bbp-title' }
  | { kind: 'bbp-description' }
  | { kind: 'action-connect' }
  | { kind: 'action-disconnect' }
  | { kind: 'action-discovery' }
  | { kind: 'action-copy-log' }
  | { kind: 'log-summary' }
  | { kind: 'not-connected' }
  | { kind: 'no-device' }
  | { kind: 'gatt-failed' }
  | { kind: 'blocked'; block: BtBlock }
  | { kind: 'bt-error'; message: string }
  | {
      kind: 'pass-status'
      attach: AttachKind
      batteryPercent: number
      deviceBestSp: number
    }
  | { kind: 'link'; event: LinkEvent }
  | { kind: 'packet'; uuidPrefix: string; hex: string }
  | { kind: 'protocol'; code: string }
  | { kind: 'unknown-packet'; header: number; hex: string }
  | { kind: 'skip-duplicate'; sp: number }
  | { kind: 'skip-initial-sync'; sp: number }
  | { kind: 'log-copied' }
  | { kind: 'copy-failed' }
  | { kind: 'caught'; errorName: string; message: string }
  | { kind: 'stopwatch-title' }
  | { kind: 'stopwatch-description' }
  | { kind: 'action-start' }
  | { kind: 'action-stop' }
  | { kind: 'action-reset' }
  | { kind: 'best-spin'; ms: number }
  | { kind: 'best-spin-empty' }
  | { kind: 'seconds'; ms: number }
  | { kind: 'shout-title' }
  | { kind: 'shout-description' }
  | { kind: 'action-record' }
  | { kind: 'action-play' }
  | { kind: 'action-builtin' }
  | { kind: 'shout-unsupported' }
  | { kind: 'shout-recording'; maxSeconds: number }
  | { kind: 'shout-saved' }
  | { kind: 'shout-mic'; errorName: string }
  | { kind: 'shout-playback-failed' }
  | { kind: 'shout-speech-unsupported' }
  | { kind: 'countdown-spoken' }
  | { kind: 'battle-title' }
  | { kind: 'battle-description' }
  | { kind: 'player-label'; player: 1 | 2 }
  | { kind: 'action-start-battle' }
  | { kind: 'battle-draw' }
  | { kind: 'battle-win'; player: 1 | 2; marginMs: number }
  | { kind: 'score'; p1: number; p2: number }

export type LaunchNotice = Extract<
  Message,
  {
    kind:
      | 'motion-window'
      | 'motion-recorded'
      | 'motion-missing'
      | 'motion-denied'
      | 'motion-silent'
      | 'motion-still'
      | 'bbp-launch'
  }
>

export type StatusNotice = Extract<
  Message,
  {
    kind:
      | 'not-connected'
      | 'no-device'
      | 'gatt-failed'
      | 'blocked'
      | 'bt-error'
      | 'pass-status'
      | 'link'
  }
>

export type LogNotice = Extract<
  Message,
  {
    kind:
      | 'packet'
      | 'protocol'
      | 'unknown-packet'
      | 'skip-duplicate'
      | 'skip-initial-sync'
      | 'log-copied'
      | 'copy-failed'
      | 'caught'
      | 'link'
      | 'gatt-failed'
  }
>

export type ShoutNotice = Extract<
  Message,
  {
    kind:
      | 'shout-unsupported'
      | 'shout-recording'
      | 'shout-saved'
      | 'shout-mic'
      | 'shout-playback-failed'
      | 'shout-speech-unsupported'
  }
>

export type BattleNotice = Extract<Message, { kind: 'battle-draw' | 'battle-win' }>

export type LogRow = {
  at: number
  line: LogNotice
}

type Phrasebook = {
  [K in Message['kind']]: Record<Lang, (message: Extract<Message, { kind: K }>) => string>
}

function pick(lang: Lang, text: Readonly<Record<Lang, string>>): string {
  switch (lang) {
    case 'en':
      return text.en
    case 'zh-Hant':
      return text['zh-Hant']
    default: {
      const _never: never = lang
      return _never
    }
  }
}

function deviceLabel(lang: Lang, name: string | null): string {
  if (name) {
    return name
  }
  return pick(lang, { en: 'device', 'zh-Hant': '裝置' })
}
