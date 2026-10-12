import { loadJson, saveJson } from '@/lib/storage'

export type BattleWins = [number, number]

const KEY = 'wins'

export function loadWins(): BattleWins {
  const v = loadJson<BattleWins>(KEY, [0, 0])
  if (!Array.isArray(v) || v.length !== 2) {
    return [0, 0]
  }
  return [Number(v[0]) || 0, Number(v[1]) || 0]
}

export function saveWins(wins: BattleWins): void {
  saveJson(KEY, wins)
}
