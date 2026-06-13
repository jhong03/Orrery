// Verifies S4 meteors: streaks appear during an active shower at night and
// stay absent in daylight / out of season. Stochastic, so it samples a window.
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

// Count frames (over ~8s wall-clock) where any meteor vertex is non-zero.
const sampleStreaks = async (seconds) => {
  let sawStreak = false
  let maxLen = 0
  const end = Date.now() + seconds * 1000
  while (Date.now() < end) {
    const n = await page.evaluate(() => {
      let count = 0
      window.__scene.traverse((o) => {
        if (o.isLineSegments && o.geometry?.attributes?.color) {
          const c = o.geometry.attributes.color.array
          for (let i = 0; i < c.length; i++) if (c[i] > 0.05) count++
        }
      })
      return count
    })
    if (n > 0) {
      sawStreak = true
      maxLen = Math.max(maxLen, n)
    }
    await page.waitForTimeout(120)
  }
  return { sawStreak, maxLen }
}

const results = {}

// Geminids peak (Dec 14), midnight over the central US, radiant high.
await page.evaluate((jd) => {
  window.__orrery.useTimeStore.getState().setPlaying(false)
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(40, -100, { placeName: 'Kansas' })
}, jdOf('2026-12-14T06:30:00Z'))
await page.waitForTimeout(800)
results.geminidsNight = await sampleStreaks(9)
await page.screenshot({ path: 'scripts/tour/meteors-geminids.png' })

// Same shower, but local noon -> daylight, no meteors.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-12-14T18:30:00Z'))
await page.waitForTimeout(800)
results.geminidsDay = await sampleStreaks(4)

// Out of season (June) -> no active shower at all.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-06-15T06:30:00Z'))
await page.waitForTimeout(800)
results.juneNight = await sampleStreaks(4)

results.pass =
  results.geminidsNight.sawStreak && !results.geminidsDay.sawStreak && !results.juneNight.sawStreak

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
