import { readU16LE, toHex } from './bytes.ts'
import type { AttachState, PassStatus } from './types.ts'

function attachFromCode(code: number): AttachState {
  switch (code) {
    case 0x04:
    case 0x14:
      return { kind: 'attached', code }
    case 0x10:
      return { kind: 'click', code }
    case 0x00:
      return { kind: 'detached', code }
    default:
      return { kind: 'unknown', code }
  }
}

export function parseStatus(packet: Uint8Array): PassStatus {
  const code = packet[3] ?? 0
  const batteryRaw = packet[4] ?? 0
  return {
    attach: attachFromCode(code),
    batteryRaw,
    batteryPercent: batteryRaw / 2.5,
    voltageVolts: 2 + batteryRaw * 0.004,
    deviceBestSp: readU16LE(packet, 7),
    totalLaunches: readU16LE(packet, 9),
    deviceIdHex: toHex(packet.subarray(11, 17)),
  }
}
