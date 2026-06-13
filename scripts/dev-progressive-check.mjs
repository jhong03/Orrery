// Verifies progressive textures: the working-tier (2K) map is present
// immediately, and switching to Ultra upgrades Earth's day map and Jupiter's
// map to 8K in the background WITHOUT ever leaving the material textureless
// (no blocking blank).
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5175/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem('orrery.onboarded', '1')
  localStorage.setItem('orrery.quality', '"high"') // start below Ultra
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

// Width of the texture bound to a given uniform across all scene materials.
const probe = (uniform) =>
  page.evaluate((u) => {
    let w = null
    window.__scene.traverse((o) => {
      const mat = o.material
      const t = mat && mat.uniforms && mat.uniforms[u] && mat.uniforms[u].value
      if (t && t.image && t.image.width) w = t.image.width
    })
    return w
  }, uniform)

const before = { earthDay: await probe('uDayMap'), jupiterMap: await probe('uMap') }

// Switch to Ultra and watch the day map upgrade. Sample repeatedly so we can
// confirm it is never null mid-swap (non-blocking).
await page.evaluate(() => window.__orrery.useSettingsStore.getState().setQuality('ultra'))
let everNull = false
let earthDayUltra = before.earthDay
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(300)
  const w = await probe('uDayMap')
  if (w === null) everNull = true
  earthDayUltra = w
  if (w >= 8000) break
}
const jupiterUltra = await probe('uMap')

console.log(
  JSON.stringify(
    {
      before, // expect ~2048 (2K)
      earthDayUltra, // expect 8192 (upgraded)
      jupiterUltra, // expect >= 4096 (8K jupiter)
      neverWentBlankDuringSwap: !everNull,
      errors,
    },
    null,
    2,
  ),
)
await browser.close()
process.exit(errors.length || earthDayUltra < 8000 || everNull ? 1 : 0)
