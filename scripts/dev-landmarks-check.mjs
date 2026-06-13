// Verifies special locations: searchable in Ctrl+K, entering one stands you
// there with its "why special" note shown in the surface HUD.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const results = {}

// Search "smallest" -> Vatican City (matched via the note keyword).
await page.keyboard.press('Control+k')
await page.waitForSelector('.search-palette')
await page.keyboard.type('smallest country')
await page.waitForTimeout(200)
results.smallestTopHit = await page.locator('.search-item-title').first().innerText()
await page.keyboard.press('Enter')
await page.waitForTimeout(800)
results.vaticanState = await page.evaluate(() => {
  const s = window.__orrery.useSurfaceStore.getState()
  return { active: s.active, place: s.placeName, note: s.note }
})
results.vaticanHudNote = await page.locator('.surface-note').innerText()

// "Midnight sun" -> North Cape, and verify the Sun stays up at solstice midnight.
await page.keyboard.press('Control+k')
await page.keyboard.type('midnight sun')
await page.waitForTimeout(200)
results.midnightTopHit = await page.locator('.search-item-title').first().innerText()
await page.keyboard.press('Enter')
await page.waitForTimeout(600)
// Set local solstice midnight (North Cape ~25E -> ~22:00 UTC) and read Sun altitude.
results.northCapeSunAltMidnight = await page.evaluate(() => {
  const jd = new Date('2026-06-21T22:00:00Z').getTime() / 86400000 + 2440587.5
  window.__orrery.useTimeStore.getState().setJd(jd)
  const f = window.__orrery.frame
  const s = window.__orrery.useSurfaceStore.getState()
  // crude alt: Sun ecliptic dir vs local up via stored frame after a tick
  return new Promise((res) => {
    requestAnimationFrame(() => {
      const dx = f.sys.sun.x - f.sys.earth.x
      const dy = f.sys.sun.y - f.sys.earth.y
      const dz = f.sys.sun.z - f.sys.earth.z
      // up ≈ earth axes radial at the observer; approximate via lat/lon normal
      const D = Math.PI / 180
      const ax = f.axes.earth
      const cLat = Math.cos(s.latDeg * D),
        sLat = Math.sin(s.latDeg * D)
      const cLon = Math.cos(s.lonDeg * D),
        sLon = Math.sin(s.lonDeg * D)
      const up = {
        x: cLat * cLon * ax.xAxis.x + cLat * sLon * ax.yAxis.x + sLat * ax.zAxis.x,
        y: cLat * cLon * ax.xAxis.y + cLat * sLon * ax.yAxis.y + sLat * ax.zAxis.y,
        z: cLat * cLon * ax.xAxis.z + cLat * sLon * ax.yAxis.z + sLat * ax.zAxis.z,
      }
      const len = Math.hypot(dx, dy, dz)
      const sinAlt = (dx * up.x + dy * up.y + dz * up.z) / len
      res(+((Math.asin(sinAlt) * 180) / Math.PI).toFixed(1))
    })
  })
})

results.pass =
  /Vatican/i.test(results.smallestTopHit) &&
  /0\.49/.test(results.vaticanHudNote) &&
  /North Cape/i.test(results.midnightTopHit) &&
  results.northCapeSunAltMidnight > 0 // Sun above the horizon at midnight

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
