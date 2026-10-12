import { expect, test } from 'vitest'
import {
  buildHistoryPackets,
  buildStatusPacket,
  createPassSession,
  historyChecksum,
  toHex,
} from './index.ts'
import type { DomainEvent } from './index.ts'

function ingestAll(
  session: { ingest: (bytes: Uint8Array) => DomainEvent[] },
  packets: readonly Uint8Array[],
): DomainEvent[] {
  return packets.flatMap((packet) => session.ingest(packet))
}

function at(packets: readonly Uint8Array[], index: number): Uint8Array {
  const packet = packets[index]
  if (!packet) {
    throw new Error(`missing packet ${index}`)
  }
  return packet
}

test('status A0 fixture is attached at 100 percent and 3 volts', () => {
  const packet = buildStatusPacket(0x04, 250, 1500, 1)
  expect(toHex(packet)).toBe('a0 00 00 04 fa 00 00 dc 05 01 00 aa bb cc dd ee ff')

  const session = createPassSession({ lastKey: null })
  expect(session.ingest(packet)).toEqual([
    {
      type: 'status',
      status: {
        attach: { kind: 'attached', code: 0x04 },
        batteryRaw: 250,
        batteryPercent: 100,
        voltageVolts: 3,
        deviceBestSp: 1500,
        totalLaunches: 1,
        deviceIdHex: 'aa bb cc dd ee ff',
      },
    },
  ])
  expect(session.peekLastKey()).toBe(null)
})

test('attach codes 0x14, 0x10, 0x00, and anything else', () => {
  const session = createPassSession({ lastKey: null })
  expect(session.ingest(buildStatusPacket(0x14, 250, 1500, 1))).toEqual([
    {
      type: 'status',
      status: {
        attach: { kind: 'attached', code: 0x14 },
        batteryRaw: 250,
        batteryPercent: 100,
        voltageVolts: 3,
        deviceBestSp: 1500,
        totalLaunches: 1,
        deviceIdHex: 'aa bb cc dd ee ff',
      },
    },
  ])
  expect(session.ingest(buildStatusPacket(0x10, 125, 0, 0))).toEqual([
    {
      type: 'status',
      status: {
        attach: { kind: 'click', code: 0x10 },
        batteryRaw: 125,
        batteryPercent: 50,
        voltageVolts: 2.5,
        deviceBestSp: 0,
        totalLaunches: 0,
        deviceIdHex: 'aa bb cc dd ee ff',
      },
    },
  ])
  expect(session.ingest(buildStatusPacket(0x00, 0, 0, 0))).toEqual([
    {
      type: 'status',
      status: {
        attach: { kind: 'detached', code: 0x00 },
        batteryRaw: 0,
        batteryPercent: 0,
        voltageVolts: 2,
        deviceBestSp: 0,
        totalLaunches: 0,
        deviceIdHex: 'aa bb cc dd ee ff',
      },
    },
  ])
  expect(session.ingest(buildStatusPacket(0x01, 0, 0, 0))).toEqual([
    {
      type: 'status',
      status: {
        attach: { kind: 'unknown', code: 0x01 },
        batteryRaw: 0,
        batteryPercent: 0,
        voltageVolts: 2,
        deviceBestSp: 0,
        totalLaunches: 0,
        deviceIdHex: 'aa bb cc dd ee ff',
      },
    },
  ])
})

test('three-shot history latest SP is 1500 and the first set is initial sync', () => {
  const packets = buildHistoryPackets([1320, 1415, 1500], 1500, 37, 3)
  expect(toHex(at(packets, 0))).toBe('b0 28 05 87 05 dc 05 00 00 00 00 00 00 00 00 00 00')
  expect(toHex(at(packets, 6))).toBe('b6 00 00 00 00 00 00 dc 05 25 00 03 00 00 00 00 00')
  expect(toHex(at(packets, 7))).toBe('b7 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 a3')
  expect(at(packets, 7)[16]).toBe(0xa3)

  const session = createPassSession({ lastKey: null })
  expect(ingestAll(session, packets)).toEqual([
    {
      type: 'shot',
      shot: { sp: 1500, slot: 3, totalLaunches: 37, key: '37/3' },
      decision: { action: 'skip-initial-sync', key: '37/3' },
    },
  ])
  expect(session.peekLastKey()).toBe('37/3')
})

test('the same history set ingested again is a duplicate', () => {
  const session = createPassSession({ lastKey: null })
  const first = buildHistoryPackets([1320, 1415, 1500], 1500, 37, 3)
  expect(ingestAll(session, first)).toEqual([
    {
      type: 'shot',
      shot: { sp: 1500, slot: 3, totalLaunches: 37, key: '37/3' },
      decision: { action: 'skip-initial-sync', key: '37/3' },
    },
  ])

  const second = buildHistoryPackets([1320, 1415, 1500], 1500, 37, 3)
  expect(ingestAll(session, second)).toEqual([
    {
      type: 'shot',
      shot: { sp: 1500, slot: 3, totalLaunches: 37, key: '37/3' },
      decision: { action: 'skip-duplicate', key: '37/3' },
    },
  ])
  expect(session.peekLastKey()).toBe('37/3')
})

test('a resumed session skips a shot it already stored', () => {
  const session = createPassSession({ lastKey: '1/1' })
  const packets = buildHistoryPackets([2000], 2000, 1, 1)
  expect(at(packets, 7)[16]).toBe(0xb0)
  expect(ingestAll(session, packets)).toEqual([
    {
      type: 'shot',
      shot: { sp: 2000, slot: 1, totalLaunches: 1, key: '1/1' },
      decision: { action: 'skip-duplicate', key: '1/1' },
    },
  ])
})

test('first launch syncs, and the next new launch logs', () => {
  const session = createPassSession({ lastKey: null })
  const first = buildHistoryPackets([2000], 2000, 1, 1)
  expect(toHex(at(first, 0))).toBe('b0 d0 07 00 00 00 00 00 00 00 00 00 00 00 00 00 00')
  expect(toHex(at(first, 6))).toBe('b6 00 00 00 00 00 00 d0 07 01 00 01 00 00 00 00 00')
  expect(toHex(at(first, 7))).toBe('b7 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 b0')
  expect(at(first, 7)[16]).toBe(0xb0)
  expect(ingestAll(session, first)).toEqual([
    {
      type: 'shot',
      shot: { sp: 2000, slot: 1, totalLaunches: 1, key: '1/1' },
      decision: { action: 'skip-initial-sync', key: '1/1' },
    },
  ])

  const second = buildHistoryPackets([2000, 2100], 2100, 2, 2)
  expect(ingestAll(session, second)).toEqual([
    {
      type: 'shot',
      shot: { sp: 2100, slot: 2, totalLaunches: 2, key: '2/2' },
      decision: { action: 'log' },
    },
  ])
  expect(session.peekLastKey()).toBe('2/2')

  expect(ingestAll(session, buildHistoryPackets([2000, 2100], 2100, 2, 2))).toEqual([
    {
      type: 'shot',
      shot: { sp: 2100, slot: 2, totalLaunches: 2, key: '2/2' },
      decision: { action: 'skip-duplicate', key: '2/2' },
    },
  ])
})

test('a fresh pass with total launches 0 logs the shot', () => {
  const session = createPassSession({ lastKey: null })
  const packets = buildHistoryPackets([500], 500, 0, 1)
  expect(ingestAll(session, packets)).toEqual([
    {
      type: 'shot',
      shot: { sp: 500, slot: 1, totalLaunches: 0, key: '0/1' },
      decision: { action: 'log' },
    },
  ])
  expect(session.peekLastKey()).toBe('0/1')
  expect(ingestAll(session, buildHistoryPackets([500], 500, 0, 1))).toEqual([
    {
      type: 'shot',
      shot: { sp: 500, slot: 1, totalLaunches: 0, key: '0/1' },
      decision: { action: 'skip-duplicate', key: '0/1' },
    },
  ])
})

test('a corrupt B7 checksum is rejected and lastKey stays put', () => {
  const packets = buildHistoryPackets([2000], 2000, 1, 1)
  expect(at(packets, 7)[16]).toBe(0xb0)
  at(packets, 7)[16] = 0xb1

  const session = createPassSession({ lastKey: '9/2' })
  expect(ingestAll(session, packets)).toEqual([
    { type: 'error', error: { code: 'CHECKSUM_MISMATCH', expected: 0xb0, actual: 0xb1 } },
  ])
  expect(session.peekLastKey()).toBe('9/2')

  const staleTail = new Uint8Array(17)
  staleTail[0] = 0xb7
  staleTail[16] = 0xb1
  expect(session.ingest(staleTail)).toEqual([{ type: 'error', error: { code: 'INCOMPLETE_HISTORY' } }])
  expect(session.peekLastKey()).toBe('9/2')

  const recovered = buildHistoryPackets([2000], 2000, 1, 1)
  expect(ingestAll(session, recovered)).toEqual([
    {
      type: 'shot',
      shot: { sp: 2000, slot: 1, totalLaunches: 1, key: '1/1' },
      decision: { action: 'log' },
    },
  ])
  expect(session.peekLastKey()).toBe('1/1')
})

test('slot 50 reads SP 1049 from the B6 record', () => {
  const list = [...new Array<number>(48).fill(0), 1048, 1049]
  const packets = buildHistoryPackets(list, 1049, 99, 50)
  expect(toHex(at(packets, 6))).toBe('b6 18 04 19 04 00 00 19 04 63 00 32 00 00 00 00 00')

  const session = createPassSession({ lastKey: null })
  expect(ingestAll(session, packets)).toEqual([
    {
      type: 'shot',
      shot: { sp: 1049, slot: 50, totalLaunches: 99, key: '99/50' },
      decision: { action: 'skip-initial-sync', key: '99/50' },
    },
  ])
  expect(session.peekLastKey()).toBe('99/50')
})

test('slot 0 is rejected and does not consume the initial sync', () => {
  const session = createPassSession({ lastKey: null })
  expect(ingestAll(session, buildHistoryPackets([100], 100, 4, 0))).toEqual([
    { type: 'error', error: { code: 'INVALID_SLOT', slot: 0 } },
  ])
  expect(session.peekLastKey()).toBe(null)

  expect(ingestAll(session, buildHistoryPackets([2000], 2000, 1, 1))).toEqual([
    {
      type: 'shot',
      shot: { sp: 2000, slot: 1, totalLaunches: 1, key: '1/1' },
      decision: { action: 'skip-initial-sync', key: '1/1' },
    },
  ])
})

test('slot 51 is rejected', () => {
  const packets = buildHistoryPackets([100], 100, 3, 1)
  const list = packets.slice(0, 7)
  const meta = at(list, 6).slice()
  meta[11] = 51
  list[6] = meta
  const tail = new Uint8Array(17)
  tail[0] = 0xb7
  tail[16] = historyChecksum(list)

  const session = createPassSession({ lastKey: '1/1' })
  expect(ingestAll(session, [...list, tail])).toEqual([
    { type: 'error', error: { code: 'INVALID_SLOT', slot: 51 } },
  ])
  expect(session.peekLastKey()).toBe('1/1')
})

test('B7 without every list packet is an incomplete history', () => {
  const session = createPassSession({ lastKey: '4/4' })
  const packets = buildHistoryPackets([1320, 1415, 1500], 1500, 37, 3)
  const events = packets.flatMap((packet, index) => (index === 4 ? [] : session.ingest(packet)))
  expect(events).toEqual([{ type: 'error', error: { code: 'INCOMPLETE_HISTORY' } }])
  expect(session.peekLastKey()).toBe('4/4')

  expect(session.ingest(at(packets, 4))).toEqual([])
  expect(session.ingest(at(packets, 7))).toEqual([
    { type: 'error', error: { code: 'INCOMPLETE_HISTORY' } },
  ])
  expect(session.peekLastKey()).toBe('4/4')
})

test('a 17-byte unsupported header is unknown', () => {
  const packet = new Uint8Array(17)
  packet[0] = 0x99
  packet[16] = 0x01
  const session = createPassSession({ lastKey: null })
  expect(session.ingest(packet)).toEqual([
    {
      type: 'unknown',
      header: 0x99,
      hex: '99 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01',
    },
  ])
})

test('length other than 17 is PACKET_TOO_SHORT', () => {
  const session = createPassSession({ lastKey: null })
  expect(session.ingest(new Uint8Array())).toEqual([
    { type: 'error', error: { code: 'PACKET_TOO_SHORT', length: 0 } },
  ])
  expect(session.ingest(new Uint8Array([0xa0, 0x04]))).toEqual([
    { type: 'error', error: { code: 'PACKET_TOO_SHORT', length: 2 } },
  ])
  const long = new Uint8Array(18)
  long[0] = 0xa0
  expect(session.ingest(long)).toEqual([
    { type: 'error', error: { code: 'PACKET_TOO_SHORT', length: 18 } },
  ])
})

test('a reused 17-byte buffer does not clobber earlier history packets', () => {
  const session = createPassSession({ lastKey: null })
  const packets = buildHistoryPackets([2000, 2100], 2100, 2, 2)
  const buffer = new Uint8Array(17)
  const events: DomainEvent[] = []
  for (const packet of packets) {
    buffer.set(packet)
    events.push(...session.ingest(buffer))
  }
  expect(events).toEqual([
    {
      type: 'shot',
      shot: { sp: 2100, slot: 2, totalLaunches: 2, key: '2/2' },
      decision: { action: 'skip-initial-sync', key: '2/2' },
    },
  ])
  expect(session.peekLastKey()).toBe('2/2')
})

test('curve packets do not gate the following history shot', () => {
  const session = createPassSession({ lastKey: null })
  const curve70 = new Uint8Array(17)
  curve70[0] = 0x70
  curve70[1] = 0x2a
  const curve71 = new Uint8Array(17)
  curve71[0] = 0x71
  curve71[1] = 0x2a
  const curve72 = new Uint8Array(17)
  curve72[0] = 0x72
  curve72[1] = 0x2a
  const curve73 = new Uint8Array(17)
  curve73[0] = 0x73
  curve73[1] = 0x2a

  expect(session.ingest(curve70)).toEqual([
    { type: 'curve', header: 0x70, hex: '70 2a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00' },
  ])
  expect(session.ingest(curve71)).toEqual([
    { type: 'curve', header: 0x71, hex: '71 2a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00' },
  ])
  expect(session.ingest(curve72)).toEqual([
    { type: 'curve', header: 0x72, hex: '72 2a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00' },
  ])
  expect(session.ingest(curve73)).toEqual([
    { type: 'curve', header: 0x73, hex: '73 2a 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00' },
  ])
  expect(session.peekLastKey()).toBe(null)

  expect(ingestAll(session, buildHistoryPackets([1500], 1500, 4, 1))).toEqual([
    {
      type: 'shot',
      shot: { sp: 1500, slot: 1, totalLaunches: 4, key: '4/1' },
      decision: { action: 'skip-initial-sync', key: '4/1' },
    },
  ])
})
