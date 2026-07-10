// Generates PWA icons (pixel-art beer mug) as PNGs with zero dependencies.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Mug incl. handle spans columns 2–14, so the visual mass sits centered.
const ART = [
  '................',
  '................',
  '...ffffffff.....',
  '..ffffffffff....',
  '..ffffffffff....',
  '...BLBBBBBB.hh..',
  '...BLBBBBBB.h.h.',
  '...BLBBBBBB.h.h.',
  '...BLBBBBBB.h.h.',
  '...BLBBBBBB.hh..',
  '...BLBBBBBB.....',
  '...BLBBBBBB.....',
  '....BBBBBB......',
  '................',
  '................',
  '................',
]

const COLORS = {
  '.': [0x12, 0x15, 0x1c, 255],
  f: [0xf2, 0xed, 0xe4, 255],
  B: [0xf0, 0xa5, 0x31, 255],
  L: [0xf7, 0xc3, 0x68, 255],
  h: [0xf0, 0xa5, 0x31, 255],
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function png(size) {
  const grid = ART.length
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0 // filter: none
    const srcY = Math.floor((y * grid) / size)
    for (let x = 0; x < size; x++) {
      const srcX = Math.floor((x * grid) / size)
      const [r, g, b, a] = COLORS[ART[srcY][srcX]]
      const p = row + 1 + x * 4
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
      raw[p + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })
for (const size of [180, 192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), png(size))
  console.log(`icon-${size}.png`)
}
