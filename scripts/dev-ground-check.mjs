// Verifies S2 ground imagery: Esri tiles load into textured planes, daytime
// land is bright and night land is dark. Network-dependent (Esri World Imagery).
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const tileRequests = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
page.on('response', (r) => {
  if (r.url().includes('World_Imagery')) tileRequests.push(r.status())
})

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const results = {}

// Daytime over the Grand Canyon (recognizable terrain), local ~noon (19:00 UTC).
await page.evaluate((jd) => {
  const t = window.__orrery.useTimeStore.getState()
  t.setPlaying(false)
  t.setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(36.1, -112.1, { placeName: 'Grand Canyon' })
}, jdOf('2026-06-13T19:00:00Z'))
await page.waitForTimeout(4000) // let tiles fetch + decode

const tileInfo = () =>
  page.evaluate(() => {
    let withMap = 0
    let brightnessSum = 0
    window.__scene.traverse((o) => {
      const m = o.material
      if (m && m.isMeshBasicMaterial && m.map && m.map.image) {
        withMap++
        brightnessSum += m.color.r
      }
    })
    return { texturedPlanes: withMap, avgBrightness: withMap ? brightnessSum / withMap : 0 }
  })

results.dayTiles = await tileInfo()
results.tileResponses = { count: tileRequests.length, ok: tileRequests.filter((s) => s === 200).length }
await page.screenshot({ path: 'scripts/tour/ground-day.png' })

// Look down at the ground (grab-the-sky: drag UP tilts the view down).
// Several strokes to drive the pitch to its downward limit.
for (let i = 0; i < 4; i++) {
  await page.mouse.move(720, 750)
  await page.mouse.down()
  await page.mouse.move(720, 150, { steps: 8 })
  await page.mouse.up()
}
await page.waitForTimeout(500)
results.lookDownPitchDeg = await page.evaluate(
  () => +((window.__camera.rotation.x * 180) / Math.PI).toFixed(1),
)
await page.screenshot({ path: 'scripts/tour/ground-day-down.png' })

// Night: jump 12h, land should darken markedly.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-06-13T07:00:00Z'))
await page.waitForTimeout(800)
results.nightBrightness = (await tileInfo()).avgBrightness

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)

