export type BtBlock =
  | { kind: 'insecure' }
  | { kind: 'ios-no-web-bluetooth' }
  | { kind: 'no-web-bluetooth' }

export type BluetoothAvailability = { ok: true } | { ok: false; block: BtBlock }

export function bluetoothAvailability(): BluetoothAvailability {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (!window.isSecureContext) {
    return { ok: false, block: { kind: 'insecure' } }
  }
  if (!navigator.bluetooth) {
    if (ios) {
      return { ok: false, block: { kind: 'ios-no-web-bluetooth' } }
    }
    return { ok: false, block: { kind: 'no-web-bluetooth' } }
  }
  return { ok: true }
}
