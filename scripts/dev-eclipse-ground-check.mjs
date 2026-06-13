// Verifies S4 eclipse experience from the ground: solar totality darkens the
// sky/land and reveals stars; the 2026-03-03 total lunar eclipse glows copper.
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
await page.waitForTimeout(2000)

const evState = () => page.evaluate(() => ({ ...window.__orrery.surfaceEvents }))
const results = {}

// --- Total solar eclipse, Iceland centerline, 2026-08-12 ---
// An hour before (partial), then greatest eclipse (totality).
await page.evaluate(() => {
  window.__orrery.useTimeStore.getState().setPlaying(false)
  window.__orrery.useSurfaceStore.getState().enter(65.2, -25.2, { placeName: 'Iceland', lookAt: 'sun' })
})
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-08-12T17:00:00Z'))
await page.waitForTimeout(900)
results.partialOcclusion = +(await evState()).solarOcclusion.toFixed(3)
await page.screenshot({ path: 'scripts/tour/eclipse-partial.png' })

await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-08-12T17:46:00Z'))
// Re-enter at the totality instant so the view recenters on the eclipsed Sun.
await page.evaluate(() =>
  window.__orrery.useSurfaceStore.getState().enter(65.2, -25.2, { placeName: 'Iceland', lookAt: 'sun' }),
)
await page.waitForTimeout(900)
results.totalityOcclusion = +(await evState()).solarOcclusion.toFixed(3)
await page.screenshot({ path: 'scripts/tour/eclipse-totality.png' })

// --- Total lunar eclipse (blood moon), 2026-03-03, seen from the night side ---
// Greatest eclipse ~11:34 UTC; visible from the Pacific. Stand in Hawaii.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-03-03T11:34:00Z'))
await page.evaluate(() =>
  window.__orrery.useSurfaceStore.getState().enter(19.8, -155.5, { placeName: 'Hawaii', lookAt: 'moon' }),
)
await page.waitForTimeout(900)
results.bloodMoon = +(await evState()).lunarEclipse.toFixed(3)
await page.screenshot({ path: 'scripts/tour/eclipse-bloodmoon.png' })

results.totalityDarkerThanPartial = results.totalityOcclusion > results.partialOcclusion
results.totalitySolar = results.totalityOcclusion > 0.98
results.bloodMoonTotal = results.bloodMoon > 0.9

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
