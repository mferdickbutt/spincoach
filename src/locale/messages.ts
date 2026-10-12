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

const SOURCE_LABEL = {
  bbp: { en: 'Battle Pass', 'zh-Hant': 'Battle Pass' },
  motion: { en: 'motion', 'zh-Hant': '動作' },
  'legacy-tap': { en: 'retired input', 'zh-Hant': '已停用的輸入' },
} as const satisfies Record<LoadedSource, Record<Lang, string>>

const BLOCK_TEXT = {
  insecure: {
    en: 'Web Bluetooth needs HTTPS or localhost. Host this app on any static HTTPS server, then reconnect.',
    'zh-Hant': 'Web Bluetooth 需要 HTTPS 或 localhost。把這個應用放上任何靜態 HTTPS 伺服器後再連線。',
  },
  'ios-no-web-bluetooth': {
    en: 'This browser cannot use Web Bluetooth. SpinCoach can estimate SP only from a launch motion. If this iPhone has no motion sensor, or you decline motion, there is no SP reading.',
    'zh-Hant':
      '這個瀏覽器無法使用 Web Bluetooth。SpinCoach 只能靠發射動作估算 SP。若這支 iPhone 沒有動作感測器，或你拒絕動作授權，就沒有 SP。',
  },
  'no-web-bluetooth': {
    en: 'This browser has no Web Bluetooth. Use Chrome or Edge on Android or desktop.',
    'zh-Hant': '這個瀏覽器沒有 Web Bluetooth。請在 Android 或桌面使用 Chrome 或 Edge。',
  },
} as const satisfies Record<BtBlock['kind'], Record<Lang, string>>

const LINK_TEXT = {
  connecting: (lang: Lang, event: Extract<LinkEvent, { kind: 'connecting' }>) => {
    const name = deviceLabel(lang, event.deviceName)
    return pick(lang, {
      en: `Connecting to ${name}…`,
      'zh-Hant': `正在連線到 ${name}…`,
    })
  },
  service: (lang: Lang, event: Extract<LinkEvent, { kind: 'service' }>) =>
    pick(lang, {
      en: `service ${event.uuid}`,
      'zh-Hant': `服務 ${event.uuid}`,
    }),
  'characteristics-unavailable': (
    lang: Lang,
    event: Extract<LinkEvent, { kind: 'characteristics-unavailable' }>,
  ) =>
    pick(lang, {
      en: `  (can't list characteristics: ${event.errorName})`,
      'zh-Hant': `  （無法列出特徵：${event.errorName}）`,
    }),
  characteristic: (lang: Lang, event: Extract<LinkEvent, { kind: 'characteristic' }>) =>
    pick(lang, {
      en: `  char ${event.uuid} [${event.flags}]`,
      'zh-Hant': `  特徵 ${event.uuid} [${event.flags}]`,
    }),
  'notify-failed': (lang: Lang, event: Extract<LinkEvent, { kind: 'notify-failed' }>) =>
    pick(lang, {
      en: `  notify failed: ${event.errorName}`,
      'zh-Hant': `  訂閱失敗：${event.errorName}`,
    }),
  listening: (lang: Lang, event: Extract<LinkEvent, { kind: 'listening' }>) => {
    const name = deviceLabel(lang, event.deviceName)
    if (event.discovery) {
      return pick(lang, {
        en: `Discovery: ${name} · listening on ${event.subs} characteristic(s). Launch now.`,
        'zh-Hant': `探索：${name} · 正在聽 ${event.subs} 個特徵。現在發射。`,
      })
    }
    return pick(lang, {
      en: `Connected to ${name} · listening on ${event.subs} characteristic(s). Launch now.`,
      'zh-Hant': `已連線到 ${name} · 正在聽 ${event.subs} 個特徵。現在發射。`,
    })
  },
  disconnected: (lang: Lang, _event: Extract<LinkEvent, { kind: 'disconnected' }>) =>
    pick(lang, {
      en: 'Disconnected',
      'zh-Hant': '已中斷連線',
    }),
} satisfies {
  [K in LinkEvent['kind']]: (lang: Lang, event: Extract<LinkEvent, { kind: K }>) => string
}

function staticText(en: string, zhHant: string): Record<Lang, () => string> {
  return {
    en: () => en,
    'zh-Hant': () => zhHant,
  }
}

const PHRASES = {
  tagline: staticText(
    'Launch, spin, and battle trainer for spinning-top players',
    '給陀螺玩家的發射、旋轉與對戰練習',
  ),
  footer: staticText(
    'Independent fan-made training tool. Not affiliated with Takara Tomy, Hasbro, or any toy brand.',
    '獨立的粉絲自製練習工具。與 Takara Tomy、Hasbro 或任何玩具品牌無關。',
  ),
  'nav-launch': staticText('Launch', '發射'),
  'nav-stopwatch': staticText('Stopwatch', '碼錶'),
  'nav-shout': staticText('Shout', '喊聲'),
  'nav-battle': staticText('2 Player', '雙人'),
  'launch-title': staticText('Launch tracker', '發射紀錄'),
  'launch-description': staticText(
    'Log shoot power (SP) from a Battle Pass over Bluetooth, or estimate it from a 3 second launch motion.',
    '透過藍牙從 Battle Pass 記錄 SP，或用 3 秒的發射動作來估算。',
  ),
  'action-start-motion': staticText('Start motion', '開始動作'),
  'motion-window': {
    en: (message) => `Launch now. ${message.seconds} s`,
    'zh-Hant': (message) => `現在發射。${message.seconds} 秒`,
  },
  'motion-recorded': staticText('Recorded from motion.', '已從動作記錄。'),
  'motion-missing': {
    en: (message) =>
      message.battlePassHere
        ? 'This browser has no motion sensor. Connect a Battle Pass.'
        : 'This browser has no motion sensor. There is no SP reading.',
    'zh-Hant': (message) =>
      message.battlePassHere
        ? '這個瀏覽器沒有動作感測器。請連線 Battle Pass。'
        : '這個瀏覽器沒有動作感測器。沒有 SP。',
  },
  'motion-denied': {
    en: (message) =>
      message.battlePassHere
        ? 'Motion permission was declined. Connect a Battle Pass.'
        : 'Motion permission was declined. There is no SP reading.',
    'zh-Hant': (message) =>
      message.battlePassHere
        ? '已拒絕動作授權。請連線 Battle Pass。'
        : '已拒絕動作授權。沒有 SP。',
  },
  'motion-silent': staticText(
    'No motion reading arrived. Nothing was saved.',
    '沒有收到動作讀數。沒有寫入紀錄。',
  ),
  'motion-still': staticText(
    'The phone stayed still. Nothing was saved.',
    '手機保持靜止。沒有寫入紀錄。',
  ),
  'bbp-launch': {
    en: (message) => `Battle Pass launch: ${message.sp} SP`,
    'zh-Hant': (message) => `Battle Pass 發射：${message.sp} SP`,
  },
  'history-cell': {
    en: (message) => `${message.sp} SP (${pick('en', SOURCE_LABEL[message.source])})`,
    'zh-Hant': (message) => `${message.sp} SP（${pick('zh-Hant', SOURCE_LABEL[message.source])}）`,
  },
  'best-sp': {
    en: (message) => `Best: ${message.sp} SP`,
    'zh-Hant': (message) => `最佳：${message.sp} SP`,
  },
  'bbp-title': staticText('Battle Pass (BX-09)', 'Battle Pass（BX-09）'),
  'bbp-description': staticText(
    'Connect the launcher accessory over Bluetooth Low Energy to log official SP. Chrome or Edge on Android or desktop, served over HTTPS.',
    '透過藍牙低功耗連線發射器配件，記錄官方 SP。請使用 Android 或桌面版的 Chrome 或 Edge，並以 HTTPS 開啟。',
  ),
  'action-connect': staticText('Connect BX-09', '連線 BX-09'),
  'action-disconnect': staticText('Disconnect', '中斷連線'),
  'action-discovery': staticText('Discovery', '探索'),
  'action-copy-log': staticText('Copy log', '複製紀錄'),
  'log-summary': staticText('Raw packet log', '原始封包紀錄'),
  'not-connected': staticText('Not connected', '尚未連線'),
  'no-device': staticText('No device chosen.', '未選擇裝置。'),
  'gatt-failed': staticText('Could not open the Bluetooth connection.', '無法開啟藍牙連線。'),
  blocked: {
    en: (message) => pick('en', BLOCK_TEXT[message.block.kind]),
    'zh-Hant': (message) => pick('zh-Hant', BLOCK_TEXT[message.block.kind]),
  },
  'bt-error': {
    en: (message) => `Bluetooth error: ${message.message}`,
    'zh-Hant': (message) => `藍牙錯誤：${message.message}`,
  },
  'pass-status': {
    en: (message) =>
      `Connected · top ${message.attach} · battery ${message.batteryPercent}% · device best ${message.deviceBestSp} SP`,
    'zh-Hant': (message) =>
      `已連線 · 陀螺 ${message.attach} · 電量 ${message.batteryPercent}% · 裝置最佳 ${message.deviceBestSp} SP`,
  },
  link: {
    en: (message) => renderLink('en', message.event),
    'zh-Hant': (message) => renderLink('zh-Hant', message.event),
  },
  packet: {
    en: (message) => `${message.uuidPrefix} ${message.hex}`,
    'zh-Hant': (message) => `${message.uuidPrefix} ${message.hex}`,
  },
  protocol: {
    en: (message) => message.code,
    'zh-Hant': (message) => message.code,
  },
  'unknown-packet': {
    en: (message) => `unknown header ${message.header} ${message.hex}`,
    'zh-Hant': (message) => `未知標頭 ${message.header} ${message.hex}`,
  },
  'skip-duplicate': {
    en: (message) => `same launch as before (${message.sp} SP), not re-logged`,
    'zh-Hant': (message) => `與上一次相同的發射（${message.sp} SP），沒有重複記錄`,
  },
  'skip-initial-sync': {
    en: (message) => `synced device history; latest stored ${message.sp} SP (not logged)`,
    'zh-Hant': (message) => `已同步裝置歷史，最近一筆 ${message.sp} SP（沒有寫入）`,
  },
  'log-copied': staticText('log copied', '已複製紀錄'),
  'copy-failed': staticText('copy failed. Select the text manually.', '複製失敗。請手動選取文字。'),
  caught: {
    en: (message) => `error ${message.errorName}: ${message.message}`,
    'zh-Hant': (message) => `錯誤 ${message.errorName}：${message.message}`,
  },
  'stopwatch-title': staticText('Spin stopwatch', '旋轉碼錶'),
  'stopwatch-description': staticText(
    'Start when the top leaves the launcher. Stop when it dies.',
    '陀螺離開發射器時按開始，停下來時按停止。',
  ),
  'action-start': staticText('Start', '開始'),
  'action-stop': staticText('Stop', '停止'),
  'action-reset': staticText('Reset', '重設'),
  'best-spin': {
    en: (message) => `Best: ${formatSeconds(message.ms)} s`,
    'zh-Hant': (message) => `最佳：${formatSeconds(message.ms)} 秒`,
  },
  'best-spin-empty': staticText('Best: -', '最佳：-'),
  seconds: {
    en: (message) => `${formatSeconds(message.ms)} s`,
    'zh-Hant': (message) => `${formatSeconds(message.ms)} 秒`,
  },
  'shout-title': staticText('Launch shout', '發射喊聲'),
  'shout-description': staticText(
    'Record your own countdown shout and play it before each launch. Nothing leaves this device.',
    '錄下你自己的倒數喊聲，在每次發射前播放。聲音不會離開這台裝置。',
  ),
  'action-record': staticText('Record', '錄音'),
  'action-play': staticText('Play', '播放'),
  'action-builtin': staticText('Play built-in countdown', '播放內建倒數'),
  'shout-unsupported': staticText(
    "Recording isn't supported in this browser.",
    '這個瀏覽器不能錄音。',
  ),
  'shout-recording': {
    en: (message) => `Recording. ${message.maxSeconds} s max.`,
    'zh-Hant': (message) => `錄音中。最多 ${message.maxSeconds} 秒。`,
  },
  'shout-saved': staticText('Saved on this device.', '已存在這台裝置上。'),
  'shout-mic': {
    en: (message) => `Microphone unavailable: ${message.errorName}`,
    'zh-Hant': (message) => `無法使用麥克風：${message.errorName}`,
  },
  'shout-playback-failed': staticText('Playback failed.', '播放失敗。'),
  'shout-speech-unsupported': staticText('Speech is not supported.', '這個瀏覽器不能語音合成。'),
  'countdown-spoken': staticText('3, 2, 1, let it rip!', '3、2、1，轉起來！'),
  'battle-title': staticText('2-player battle', '雙人對戰'),
  'battle-description': staticText(
    'Both press Start at launch. Each player presses their side when their top stops. Longest spin wins.',
    '雙方在發射時按下開始。陀螺停下時，各自按下自己的一邊。轉得比較久的人獲勝。',
  ),
  'player-label': {
    en: (message) => `Player ${message.player}`,
    'zh-Hant': (message) => `玩家 ${message.player}`,
  },
  'action-start-battle': staticText('Start battle', '開始對戰'),
  'battle-draw': staticText('Draw!', '平手！'),
  'battle-win': {
    en: (message) => `Player ${message.player} wins by ${formatSeconds(message.marginMs)} s`,
    'zh-Hant': (message) => `玩家 ${message.player} 以 ${formatSeconds(message.marginMs)} 秒獲勝`,
  },
  score: {
    en: (message) => `Score: P1 ${message.p1} - ${message.p2} P2`,
    'zh-Hant': (message) => `比分：P1 ${message.p1} - ${message.p2} P2`,
  },
} satisfies Phrasebook

function renderLink(lang: Lang, event: LinkEvent): string {
  switch (event.kind) {
    case 'connecting':
      return LINK_TEXT.connecting(lang, event)
    case 'service':
      return LINK_TEXT.service(lang, event)
    case 'characteristics-unavailable':
      return LINK_TEXT['characteristics-unavailable'](lang, event)
    case 'characteristic':
      return LINK_TEXT.characteristic(lang, event)
    case 'notify-failed':
      return LINK_TEXT['notify-failed'](lang, event)
    case 'listening':
      return LINK_TEXT.listening(lang, event)
    case 'disconnected':
      return LINK_TEXT.disconnected(lang, event)
    default: {
      const _never: never = event
      return _never
    }
  }
}

export function say(lang: Lang, message: Message): string {
  const render = PHRASES[message.kind][lang] as (value: Message) => string
  return render(message)
}

export function formatLogClock(lang: Lang, at: number): string {
  return new Date(at).toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
