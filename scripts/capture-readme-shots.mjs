// Captures a curated set of hero screenshots for the README into
// docs/screenshots/ (committed). Run against a dev server:
//   node scripts/capture-readme-shots.mjs http://localhost:5175/
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const url = process.argv[2] ?? 'http://localhost:5175/'
const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screenshots')
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1.5,
})
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5
const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) })

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem('orrery.onboarded', '1')
  localStorage.setItem('orrery.quality', '"ultra"') // best textures for the shots
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

// 1. Orbit overview — the whole system with orbit lines.
await page.evaluate(() => {
  const t = window.__orrery.useTimeStore.getState()
  t.setPlaying(false)
})
await page.getByRole('button', { name: 'Overview' }).click()
await page.waitForTimeout(3000)
await shot('orbit-overview')

// 2. Saturn close-up (rings + InfoPanel facts).
await page.evaluate(() => window.__orrery.useSelectionStore.getState().focusBody('saturn'))
await page.waitForTimeout(3200)
await shot('saturn')

const closePanel = () =>
  page.evaluate(() => window.__orrery.useSelectionStore.getState().closeInfoPanel())
const waitGround = () =>
  page
    .waitForFunction(() => !document.querySelector('.surface-loading'), { timeout: 45000 })
    .catch(() => {})

// 3. Total lunar eclipse — the Moon turns blood-red in Earth's shadow
//    (analytic shadow tint in planet.frag; greatest eclipse 2026-03-03).
await page.evaluate((jd) => {
  const t = window.__orrery.useTimeStore.getState()
  t.setPlaying(false)
  t.setJd(jd)
  window.__orrery.useSelectionStore.getState().focusBody('moon')
}, jdOf('2026-03-03T11:34:00Z'))
await page.waitForTimeout(3200) // flight
await closePanel()
await page.waitForTimeout(400)
await shot('lunar-eclipse')

// 4. Ground view over real 3D terrain — Malaysia highlands at midday.
await page.evaluate((jd) => {
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(5.311, 101.261, { placeName: 'Malaysia' })
}, jdOf('2026-06-20T03:00:00Z'))
await closePanel()
await waitGround()
await page.waitForTimeout(2500)
// Pitch the view down to the terrain (drag bottom->top, clear of the HUD).
for (let pass = 0; pass < 3; pass++) {
  await page.mouse.move(800, 680)
  await page.mouse.down()
  for (let y = 680; y >= 140; y -= 40) await page.mouse.move(800, y, { steps: 2 })
  await page.mouse.up()
}
await page.waitForTimeout(1200)
await shot('surface-terrain')

console.log(JSON.stringify({ out: OUT, errors }, null, 2))
await browser.close()
process.exit(0)
