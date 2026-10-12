import { formatWhen } from '@/lib/format'
import { readLang } from '@/locale/lang'
import { loadJson, saveJson } from '@/lib/storage'

export type FreshSource = 'bbp' | 'motion'

export type LoadedSource = FreshSource | 'legacy-tap'

export type LaunchRecord = {
  sp: number
  source: LoadedSource
  at: string
}

const KEY = 'launches'
const BBP_KEY = 'bbpKey'
const LIMIT = 40

export function loadLaunches(): LaunchRecord[] {
  const stored = loadJson<unknown>(KEY, [])
  if (!Array.isArray(stored)) {
    return []
  }
  const launches: LaunchRecord[] = []
  for (const row of stored) {
    const parsed = parseLaunch(row)
    if (parsed) {
      launches.push(parsed)
    }
  }
  return launches
}

export function appendFresh(sp: number, source: FreshSource): LaunchRecord[] {
  const next = [{ sp, source, at: formatWhen(readLang()) }, ...loadLaunches()].slice(0, LIMIT)
  saveJson(KEY, next)
  return next
}

export function bestSp(launches: readonly LaunchRecord[]): number {
  return launches.reduce((max, row) => Math.max(max, row.sp), 0)
}

export function loadBbpKey(): string | null {
  return loadJson<string | null>(BBP_KEY, null)
}

export function saveBbpKey(key: string): void {
  saveJson(BBP_KEY, key)
}

function parseLaunch(row: unknown): LaunchRecord | null {
  if (typeof row !== 'object' || row === null) {
    return null
  }
  if (!('sp' in row) || !('at' in row) || !('source' in row)) {
    return null
  }
  const { sp, at, source } = row
  if (typeof sp !== 'number' || !Number.isFinite(sp) || typeof at !== 'string') {
    return null
  }
  const loaded = parseLoadedSource(source)
  if (!loaded) {
    return null
  }
  return { sp, source: loaded, at }
}

function parseLoadedSource(source: unknown): LoadedSource | null {
  switch (source) {
    case 'bbp':
    case 'motion':
      return source
    case 'tap':
    case 'legacy-tap':
      return 'legacy-tap'
    default:
      return null
  }
}
