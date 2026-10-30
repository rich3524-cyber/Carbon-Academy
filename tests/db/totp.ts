import { createHmac } from 'node:crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(secret: string): Buffer {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => {
      const value = BASE32.indexOf(char)
      if (value < 0) throw new Error('TOTP secret is not base32')
      return value.toString(2).padStart(5, '0')
    })
    .join('')
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)))
}

/** RFC 6238 code as Supabase checks it: SHA-1, 6 digits, 30-second steps. */
export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0')
}
