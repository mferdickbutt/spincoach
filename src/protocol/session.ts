import { toHex } from './bytes.ts'
import {
  BBP_HEADER_CURVE_FIRST,
  BBP_HEADER_CURVE_LAST,
  BBP_HEADER_HISTORY_FIRST,
  BBP_HEADER_HISTORY_LAST,
  BBP_HEADER_STATUS,
  BBP_PACKET_LENGTH,
} from './constants.ts'
import { assembleHistory } from './history.ts'
import { parseStatus } from './status.ts'
import type { DomainEvent, LogDecision, OfficialShot, PassStatus, ProtocolError } from './types.ts'

export type PassSession = {
  ingest: (bytes: Uint8Array) => DomainEvent[]
  peekLastKey: () => string | null
}

type Classified =
  | { type: 'status'; status: PassStatus }
  | { type: 'curve'; header: number; hex: string }
  | { type: 'history'; header: number; bytes: Uint8Array }
  | { type: 'unknown'; header: number; hex: string }
  | { type: 'error'; error: ProtocolError }

function classify(bytes: Uint8Array): Classified {
  if (bytes.length !== BBP_PACKET_LENGTH) {
    return { type: 'error', error: { code: 'PACKET_TOO_SHORT', length: bytes.length } }
  }
  const header = bytes[0] ?? 0
  if (header === BBP_HEADER_STATUS) {
    return { type: 'status', status: parseStatus(bytes) }
  }
  if (header >= BBP_HEADER_CURVE_FIRST && header <= BBP_HEADER_CURVE_LAST) {
    return { type: 'curve', header, hex: toHex(bytes) }
  }
  if (header >= BBP_HEADER_HISTORY_FIRST && header <= BBP_HEADER_HISTORY_LAST) {
    return { type: 'history', header, bytes }
  }
  return { type: 'unknown', header, hex: toHex(bytes) }
}

function decide(lastKey: string | null, shot: OfficialShot): LogDecision {
  if (lastKey === shot.key) {
    return { action: 'skip-duplicate', key: shot.key }
  }
  if (lastKey === null && shot.totalLaunches > 0) {
    return { action: 'skip-initial-sync', key: shot.key }
  }
  return { action: 'log' }
}

export function createPassSession({ lastKey }: { lastKey: string | null }): PassSession {
  const history = new Map<number, Uint8Array>()
  let currentKey = lastKey

  function ingestHistory(header: number, bytes: Uint8Array): DomainEvent[] {
    history.set(header, bytes.slice())
    if (header !== BBP_HEADER_HISTORY_LAST) {
      return []
    }
    const assembled = assembleHistory(history)
    history.clear()
    if (!assembled.ok) {
      return [{ type: 'error', error: assembled.error }]
    }
    const decision = decide(currentKey, assembled.shot)
    currentKey = assembled.shot.key
    return [{ type: 'shot', shot: assembled.shot, decision }]
  }

  function ingest(bytes: Uint8Array): DomainEvent[] {
    const packet = classify(bytes)
    switch (packet.type) {
      case 'status':
        return [{ type: 'status', status: packet.status }]
      case 'curve':
        return [{ type: 'curve', header: packet.header, hex: packet.hex }]
      case 'unknown':
        return [{ type: 'unknown', header: packet.header, hex: packet.hex }]
      case 'error':
        return [{ type: 'error', error: packet.error }]
      case 'history':
        return ingestHistory(packet.header, packet.bytes)
      default: {
        const _never: never = packet
        return _never
      }
    }
  }

  return {
    ingest,
    peekLastKey: () => currentKey,
  }
}
