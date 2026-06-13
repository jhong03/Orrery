// Quick visual check of surface-mode terrain quality: stand in daytime
// Malaysia highlands (the reported bad view) and a couple of dramatic-relief
// spots, look toward the horizon, and screenshot.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const spots = [
  { name: 'malaysia', lat: 5.311, lon: 101.261, iso: '2026-06-20T03:00:00Z', look: 0 },
  { name: 'alps', lat: 45.976, lon: 7.658, iso: '2026-06-20T10:00:00Z', look: 200 },
  { name: 'grand-canyon', lat: 36.1, lon: -112.1, iso: '2026-06-20T18:00:00Z', look: 90 },
]

for (const s of spots) {
  await page.evaluate(
    ({ lat, lon, jd }) => {
      const t = window.__orrery.useTimeStore.getState()
      t.setPlaying(false)
      t.setJd(jd)
      window.__orrery.useSurfaceStore.getState().enter(lat, lon, { placeName: 'check' })
    },
    { lat: s.lat, lon: s.lon, jd: jdOf(s.iso) },
  )
  // Wait for the preload gate to clear (the loading pill disappears).
  await page
    .waitForFunction(() => !document.querySelector('.surface-loading'), { timeout: 25000 })
    .catch(() => {})
  await page.waitForTimeout(1500)
  // Pitch the view down to the ground (grab-the-sky: drag bottom->top lowers
  // the look altitude). Stay clear of the timeline HUD (bottom ~y>780) and
  // repeat so we end looking well below the horizon.
  for (let pass = 0; pass < 3; pass++) {
    await page.mouse.move(720, 700)
    await page.mouse.down()
    for (let y = 700; y >= 120; y -= 40) await page.mouse.move(720, y, { steps: 2 })
    await page.mouse.up()
  }
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `scripts/tour/terrain-${s.name}.png` })
  const elev = await page.evaluate(() => {
    // count rendered ground meshes (renderOrder -39)
    let n = 0
    window.__scene.traverse((o) => {
      if (o.isMesh && o.renderOrder === -39) n++
    })
    return n
  })
  console.log(`${s.name}: groundMeshes=${elev}`)
}

console.log(JSON.stringify({ errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
