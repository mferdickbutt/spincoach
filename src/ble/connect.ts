import { BBP_NAME_PREFIX, BBP_NOTIFY_UUID, BBP_SERVICE_UUID, toHex } from '@/protocol'

export type RawNotify = {
  serviceUuid: string
  characteristicUuid: string
  bytes: Uint8Array
  hex: string
  at: number
}

export type LinkEvent =
  | { kind: 'connecting'; deviceName: string | null }
  | { kind: 'service'; uuid: string }
  | { kind: 'characteristics-unavailable'; errorName: string }
  | { kind: 'characteristic'; uuid: string; flags: string }
  | { kind: 'notify-failed'; errorName: string }
  | { kind: 'listening'; discovery: boolean; deviceName: string | null; subs: number }
  | { kind: 'disconnected' }

export class ConnectFailed extends Error {
  readonly code = 'gatt-connect-failed' as const

  constructor() {
    super('GATT connect failed')
    this.name = 'ConnectFailed'
  }
}

export type ConnectStatus = (event: LinkEvent) => void

function notifyFlags(c: BluetoothRemoteGATTCharacteristic): string {
  const p = c.properties
  return (['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'] as const)
    .filter((k) => p[k])
    .join(',')
}

export class BattlePassConnection {
  private device: BluetoothDevice | null = null
  private unsubDisconnect: (() => void) | null = null

  get connected(): boolean {
    return Boolean(this.device?.gatt?.connected)
  }

  get name(): string {
    return this.device?.name || 'device'
  }

  async connect(
    discovery: boolean,
    onNotify: (packet: RawNotify) => void,
    onStatus: ConnectStatus,
    onClosed: () => void,
  ): Promise<void> {
    const device = await navigator.bluetooth.requestDevice(
      discovery
        ? { acceptAllDevices: true, optionalServices: [BBP_SERVICE_UUID] }
        : {
            filters: [{ namePrefix: BBP_NAME_PREFIX }],
            optionalServices: [BBP_SERVICE_UUID],
          },
    )
    this.device = device
    onStatus({ kind: 'connecting', deviceName: device.name || null })

    const onDisc = () => {
      onStatus({ kind: 'disconnected' })
      onClosed()
    }
    device.addEventListener('gattserverdisconnected', onDisc)
    this.unsubDisconnect = () => {
      device.removeEventListener('gattserverdisconnected', onDisc)
    }

    const server = await device.gatt?.connect()
    if (!server) {
      throw new ConnectFailed()
    }

    const services = discovery
      ? await server.getPrimaryServices()
      : [await server.getPrimaryService(BBP_SERVICE_UUID)]

    let subs = 0
    for (const service of services) {
      onStatus({ kind: 'service', uuid: service.uuid })
      let chars: BluetoothRemoteGATTCharacteristic[] = []
      try {
        chars = await service.getCharacteristics()
      } catch (err) {
        const errorName = err instanceof Error ? err.name : 'Error'
        onStatus({ kind: 'characteristics-unavailable', errorName })
        continue
      }
      for (const ch of chars) {
        onStatus({ kind: 'characteristic', uuid: ch.uuid, flags: notifyFlags(ch) })
        if (!ch.properties.notify && !ch.properties.indicate) {
          continue
        }
        if (!discovery && ch.uuid.toLowerCase() !== BBP_NOTIFY_UUID.toLowerCase()) {
          continue
        }
        try {
          ch.addEventListener('characteristicvaluechanged', (event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic
            const view = target.value
            if (!view) {
              return
            }
            const bytes = new Uint8Array(view.byteLength)
            bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
            onNotify({
              serviceUuid: service.uuid,
              characteristicUuid: target.uuid,
              bytes,
              hex: toHex(bytes),
              at: Date.now(),
            })
          })
          await ch.startNotifications()
          subs += 1
        } catch (err) {
          const errorName = err instanceof Error ? err.name : 'Error'
          onStatus({ kind: 'notify-failed', errorName })
        }
      }
    }

    onStatus({
      kind: 'listening',
      discovery,
      deviceName: device.name || null,
      subs,
    })
  }

  disconnect(): void {
    this.unsubDisconnect?.()
    this.unsubDisconnect = null
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.device = null
  }
}
