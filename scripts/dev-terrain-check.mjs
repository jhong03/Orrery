// Verifies S2-3D: ground tiles carry real elevation relief (displaced
// vertices, non-zero height spread) over mountainous terrain, and the DEM
// tiles are fetched. Screenshots a dramatic spot looking toward the relief.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const dem = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
page.on('response', (r) => {
  if (r.url().includes('elevation-tiles-prod')) dem.push(r.status())
})

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const results = {}

// Grand Canyon rim, mid-morning so the relief is side-lit.
await page.evaluate((jd) => {
  window.__orrery.useTimeStore.getState().setPlaying(false)
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(36.06, -112.14, { placeName: 'Grand Canyon' })
}, jdOf('2026-06-13T16:00:00Z'))
await page.waitForTimeout(5000) // imagery + DEM fetch/decode/displace

// Inspect the vertical spread of displaced ground vertices (in km).
results.relief = await page.evaluate(() => {
  let minZ = 1e9
  let maxZ = -1e9
  let meshes = 0
  window.__scene.traverse((o) => {
    if (o.geometry?.type === 'PlaneGeometry' && o.material?.uniforms?.uMap?.value) {
      meshes++
      const p = o.geometry.getAttribute('position')
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i)
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
      }
    }
  })
  return { meshes, spreadKm: +(maxZ - minZ).toFixed(3) }
})
results.demTiles = { count: dem.length, ok: dem.filter((s) => s === 200).length }

// Tilt down gently to frame the canyon vista (not straight into a wall).
await page.mouse.move(720, 600)
await page.mouse.down()
await page.mouse.move(720, 430, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(500)
await page.screenshot({ path: 'scripts/tour/terrain-canyon.png' })

results.pass = results.relief.spreadKm > 0.3 && results.demTiles.ok > 0

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
