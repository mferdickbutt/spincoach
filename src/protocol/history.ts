import { readU16LE } from './bytes.ts'
import {
  BBP_HEADER_HISTORY_FIRST,
  BBP_HEADER_HISTORY_LAST,
  BBP_PACKET_LENGTH,
  BBP_SLOT_MAX,
  BBP_SLOT_MIN,
} from './constants.ts'
import type { OfficialShot, ProtocolError } from './types.ts'

export type HistoryAssembly =
  | { ok: true; shot: OfficialShot }
  | { ok: false; error: ProtocolError }

export function historyChecksum(packets: readonly Uint8Array[]): number {
  let sum = 0
  for (const packet of packets) {
    for (let index = 1; index < BBP_PACKET_LENGTH; index++) {
      sum += packet[index] ?? 0
    }
  }
  return sum & 0xff
}

export function assembleHistory(packets: ReadonlyMap<number, Uint8Array>): HistoryAssembly {
  const ordered: Uint8Array[] = []
  for (let header = BBP_HEADER_HISTORY_FIRST; header <= BBP_HEADER_HISTORY_LAST; header++) {
    const packet = packets.get(header)
    if (!packet || packet.length !== BBP_PACKET_LENGTH) {
      return { ok: false, error: { code: 'INCOMPLETE_HISTORY' } }
    }
    ordered.push(packet)
  }

  const list = ordered.slice(0, 7)
  const meta = ordered[6]
  const tail = ordered[7]
  if (!meta || !tail) {
    return { ok: false, error: { code: 'INCOMPLETE_HISTORY' } }
  }

  const expected = historyChecksum(list)
  const actual = tail[16] ?? 0
  if (expected !== actual) {
    return { ok: false, error: { code: 'CHECKSUM_MISMATCH', expected, actual } }
  }

  const slot = meta[11] ?? 0
  if (slot < BBP_SLOT_MIN || slot > BBP_SLOT_MAX) {
    return { ok: false, error: { code: 'INVALID_SLOT', slot } }
  }

  const recordIndex = slot - 1
  const record = ordered[Math.floor(recordIndex / 8)]
  if (!record) {
    return { ok: false, error: { code: 'INCOMPLETE_HISTORY' } }
  }

  const totalLaunches = readU16LE(meta, 9)
  return {
    ok: true,
    shot: {
      sp: readU16LE(record, 1 + (recordIndex % 8) * 2),
      slot,
      totalLaunches,
      key: `${totalLaunches}/${slot}`,
    },
  }
}
