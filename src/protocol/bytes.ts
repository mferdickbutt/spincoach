export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

export function readU16LE(bytes: Uint8Array, offset: number): number {
  const lo = bytes[offset] ?? 0
  const hi = bytes[offset + 1] ?? 0
  return lo | (hi << 8)
}

export function writeU16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >> 8) & 0xff
}
