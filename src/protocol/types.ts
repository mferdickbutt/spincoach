export type AttachState =
  | { kind: 'attached'; code: number }
  | { kind: 'detached'; code: number }
  | { kind: 'click'; code: number }
  | { kind: 'unknown'; code: number }

export type PassStatus = {
  attach: AttachState
  batteryRaw: number
  batteryPercent: number
  voltageVolts: number
  deviceBestSp: number
  totalLaunches: number
  deviceIdHex: string
}

export type OfficialShot = {
  sp: number
  slot: number
  totalLaunches: number
  key: string
}

export type LogDecision =
  | { action: 'log' }
  | { action: 'skip-duplicate'; key: string }
  | { action: 'skip-initial-sync'; key: string }

export type ProtocolError =
  | { code: 'PACKET_TOO_SHORT'; length: number }
  | { code: 'CHECKSUM_MISMATCH'; expected: number; actual: number }
  | { code: 'INCOMPLETE_HISTORY' }
  | { code: 'INVALID_SLOT'; slot: number }

export type DomainEvent =
  | { type: 'status'; status: PassStatus }
  | { type: 'shot'; shot: OfficialShot; decision: LogDecision }
  | { type: 'unknown'; header: number; hex: string }
  | { type: 'curve'; header: number; hex: string }
  | { type: 'error'; error: ProtocolError }
