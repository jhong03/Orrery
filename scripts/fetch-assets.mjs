// Downloads all textures into public/textures/. Idempotent: existing files
// are skipped. Sources and licenses are documented in ASSETS.md.
// Usage: node scripts/fetch-assets.mjs
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'textures')

const SSS = 'https://www.solarsystemscope.com/textures/download'

/** [filename, url] — all Solar System Scope files are CC BY 4.0. */
const FILES = [
  // Working tier (2K) — loaded by default.
  ['sun.jpg', `${SSS}/2k_sun.jpg`],
  ['mercury.jpg', `${SSS}/2k_mercury.jpg`],
  ['venus.jpg', `${SSS}/2k_venus_atmosphere.jpg`],
  ['earth_day.jpg', `${SSS}/2k_earth_daymap.jpg`],
  ['earth_night.jpg', `${SSS}/2k_earth_nightmap.jpg`],
  ['earth_clouds.jpg', `${SSS}/2k_earth_clouds.jpg`],
  ['moon.jpg', `${SSS}/2k_moon.jpg`],
  ['mars.jpg', `${SSS}/2k_mars.jpg`],
  ['jupiter.jpg', `${SSS}/2k_jupiter.jpg`],
  ['saturn.jpg', `${SSS}/2k_saturn.jpg`],
  ['saturn_rings.png', `${SSS}/2k_saturn_ring_alpha.png`],
  ['uranus.jpg', `${SSS}/2k_uranus.jpg`],
  ['neptune.jpg', `${SSS}/2k_neptune.jpg`],
  ['stars_milky_way.jpg', `${SSS}/8k_stars_milky_way.jpg`],
  // High tier — swapped in progressively (wired up in M6).
  ['hi/earth_day_8k.jpg', `${SSS}/8k_earth_daymap.jpg`],
  ['hi/earth_night_8k.jpg', `${SSS}/8k_earth_nightmap.jpg`],
  ['hi/jupiter_8k.jpg', `${SSS}/8k_jupiter.jpg`],
  ['hi/saturn_8k.jpg', `${SSS}/8k_saturn.jpg`],
]

await mkdir(path.join(OUT_DIR, 'hi'), { recursive: true })

let downloaded = 0
let skipped = 0
let failed = 0

for (const [name, url] of FILES) {
  const dest = path.join(OUT_DIR, name)
  const exists = await stat(dest).then(
    (s) => s.size > 0,
    () => false,
  )
  if (exists) {
    skipped++
    continue
  }
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const magicOk =
      (buf[0] === 0xff && buf[1] === 0xd8) || // JPEG
      (buf[0] === 0x89 && buf[1] === 0x50) // PNG
    if (!magicOk) throw new Error('not an image (got HTML?)')
    await writeFile(dest, buf)
    console.log(`ok   ${name}  ${(buf.length / 1024).toFixed(0)} KB`)
    downloaded++
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`)
    failed++
  }
}

console.log(`\n${downloaded} downloaded, ${skipped} skipped (already present), ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
