// Verifies surface mode S1: enter/exit, on-screen eclipse geometry
// (sun/moon separation from the ground), night sky, double-click entry.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const results = {}

// 1. Jump to 2026-08-12 totality and stand on the Iceland centerline.
await page.evaluate((jd) => {
  const t = window.__orrery.useTimeStore.getState()
  t.setPlaying(false)
  t.setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(65.2, -25.2, { placeName: 'Iceland' })
}, jdOf('2026-08-12T17:46:00Z'))
await page.waitForTimeout(1200)

results.surfaceHudVisible = (await page.locator('.surface-hud').count()) === 1
results.compassLabels = await page.locator('.compass-label').count()

const probe = () =>
  page.evaluate(() => {
    const sun = window.__scene.getObjectByName('surface-sun')
    const moonGroup = window.__scene.getObjectByName('surface-moon')
    if (!sun || !moonGroup) return null
    const moon = moonGroup.children[0]
    const worldPos = (o) => {
      o.updateWorldMatrix(true, false)
      const e = o.matrixWorld.elements
      return { x: e[12], y: e[13], z: e[14] }
    }
    const sp = worldPos(sun)
    const mp = worldPos(moon)
    const len = (v) => Math.hypot(v.x, v.y, v.z)
    const sLen = len(sp)
    const mLen = len(mp)
    const dot = (sp.x * mp.x + sp.y * mp.y + sp.z * mp.z) / (sLen * mLen)
    return {
      separationDeg: (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI,
      sunAltDeg: (Math.asin(sp.y / sLen) * 180) / Math.PI,
      sunAngRadiusDeg: (Math.atan(sun.scale.x / sLen) * 180) / Math.PI,
      moonAngRadiusDeg: (Math.atan(1737.4 / mLen) * 180) / Math.PI,
      moonDistKm: mLen,
    }
  })

results.totality = await probe()
await page.screenshot({ path: 'scripts/tour/surface-totality.png' })

// 2. An hour earlier: partial phase, moon disc beside/overlapping the sun.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-08-12T17:00:00Z'))
await page.waitForTimeout(600)
results.partial = await probe()
await page.screenshot({ path: 'scripts/tour/surface-partial.png' })

// 3. Night sky from South Australia at the same instant (sun far below horizon).
await page.evaluate(() => window.__orrery.useSurfaceStore.getState().enter(-30.5, 136, { placeName: 'Outback' }))
await page.waitForTimeout(800)
results.night = await probe()
await page.screenshot({ path: 'scripts/tour/surface-night.png' })

// 4. Leave: orbit HUD/scene return.
await page.getByRole('button', { name: 'Leave surface' }).click()
await page.waitForTimeout(800)
results.leftSurface =
  (await page.locator('.surface-hud').count()) === 0 && (await page.locator('.hud').count()) === 1

// 5. Double-click the focused Earth to stand at the clicked point.
await page.evaluate(() => {
  window.__orrery.useSelectionStore.getState().focusBody('earth')
})
await page.waitForTimeout(2600) // flight
await page.mouse.dblclick(720, 450)
await page.waitForTimeout(600)
results.dblClickEntered = await page.evaluate(() => {
  const s = window.__orrery.useSurfaceStore.getState()
  return s.active ? { lat: +s.latDeg.toFixed(1), lon: +s.lonDeg.toFixed(1) } : false
})

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)

