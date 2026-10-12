import { writeU16LE } from './bytes.ts'
import {
  BBP_HEADER_HISTORY_FIRST,
  BBP_HEADER_HISTORY_LAST,
  BBP_HEADER_LIST_LAST,
  BBP_HEADER_STATUS,
  BBP_PACKET_LENGTH,
  BBP_SLOT_MAX,
} from './constants.ts'
import { historyChecksum } from './history.ts'

const SIMULATOR_DEVICE_ID = Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])

export function buildStatusPacket(
  stateCode: number,
  batteryRaw: number,
  maxShootPower: number,
  totalLaunches: number,
): Uint8Array {
  const packet = new Uint8Array(BBP_PACKET_LENGTH)
  packet[0] = BBP_HEADER_STATUS
  packet[3] = stateCode
  packet[4] = batteryRaw
  writeU16LE(packet, 7, maxShootPower)
  writeU16LE(packet, 9, totalLaunches)
  packet.set(SIMULATOR_DEVICE_ID, 11)
  return packet
}

export function buildHistoryPackets(
  list: readonly number[],
  maxSp: number,
  total: number,
  n: number,
): Uint8Array[] {
  const count = Math.min(list.length, BBP_SLOT_MAX)
  const active = n > BBP_SLOT_MAX ? BBP_SLOT_MAX : n
  const packets: Uint8Array[] = []

  for (let header = BBP_HEADER_HISTORY_FIRST; header <= BBP_HEADER_LIST_LAST; header++) {
    const packet = new Uint8Array(BBP_PACKET_LENGTH)
    packet[0] = header
    packets.push(packet)
  }

  for (let index = 0; index < count; index++) {
    const packet = packets[Math.floor(index / 8)]
    if (!packet) {
      throw new Error(`history builder missing packet for record ${index}`)
    }
    writeU16LE(packet, 1 + (index % 8) * 2, list[index] ?? 0)
  }

  const meta = packets[6]
  if (!meta) {
    throw new Error('history builder missing B6')
  }
  writeU16LE(meta, 7, maxSp)
  writeU16LE(meta, 9, total)
  meta[11] = active

  const tail = new Uint8Array(BBP_PACKET_LENGTH)
  tail[0] = BBP_HEADER_HISTORY_LAST
  tail[16] = historyChecksum(packets)
  packets.push(tail)
  return packets
}
