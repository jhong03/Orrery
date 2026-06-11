// M3 verification shots: Halley at its 2061 perihelion, NEOWISE at its 2020
// peak, Jupiter with the Galilean moons, and the asteroid belt.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()

const setDate = (iso) =>
  page.evaluate((d) => {
    const jd = Date.parse(d) / 86400000 + 2440587.5
    window.__orrery.useTimeStore.getState().setJd(jd)
  }, iso)
const focus = (id) =>
  page.evaluate((b) => window.__orrery.useSelectionStore.getState().focusBody(b), id)

// 1. Halley near its 2061 perihelion.
await setDate('2061-07-20T00:00:00Z')
await focus('halley')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/m3-halley-2061.png' })

// 2. NEOWISE at its July 2020 show.
await setDate('2020-07-10T00:00:00Z')
await focus('neowise')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/m3-neowise-2020.png' })

// 3. Jupiter with the Galilean moons (zoom out a touch via system? just focus).
await setDate('2026-06-14T12:00:00Z')
await focus('jupiter')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/m3-jupiter-moons.png' })

// 4. Saturn with Titan.
await focus('saturn')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/m3-saturn-titan.png' })

// 5. Ceres (in the belt — shows surrounding rocks).
await focus('ceres')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/m3-ceres-belt.png' })

console.log(JSON.stringify({ errors }))
await browser.close()
process.exit(errors.length ? 1 : 0)
