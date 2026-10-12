import { loadJson, saveJson } from '@/lib/storage'

export type SpinRecord = {
  v: number
  at: string
}

const KEY = 'spins'
const LIMIT = 40

export function loadSpins(): SpinRecord[] {
  return loadJson<SpinRecord[]>(KEY, [])
}

export function appendSpin(record: SpinRecord): SpinRecord[] {
  const next = [record, ...loadSpins()].slice(0, LIMIT)
  saveJson(KEY, next)
  return next
}

export function bestSpin(spins: SpinRecord[]): number | null {
  if (spins.length === 0) {
    return null
  }
  return Math.max(...spins.map((s) => s.v))
}
