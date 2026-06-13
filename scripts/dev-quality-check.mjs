// Verifies quality presets: belt instanceCount, pixel-ratio cap, 8K texture
// fetch on Ultra, localStorage persistence, popover UI.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // so the Low preset's dpr cap is observable
})
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const probe = () =>
  page.evaluate(() => {
    let belt = null
    window.__scene.traverse((o) => {
      if (o.geometry && o.geometry.type === 'InstancedBufferGeometry') belt = o.geometry.instanceCount
    })
    return {
      quality: window.__orrery.useSettingsStore.getState().quality,
      pixelRatio: window.__gl.getPixelRatio(),
      beltInstances: belt,
    }
  })

const results = { initial: await probe() }

// Open the popover, screenshot, switch to Ultra.
await page.getByRole('button', { name: 'Graphics quality settings' }).click()
await page.waitForSelector('.settings-popover')
await page.screenshot({ path: 'scripts/tour/quality-popover.png' })
await page.locator('.settings-popover').getByRole('button', { name: 'Ultra' }).click()
await page.waitForTimeout(2500) // 8K textures load
results.ultra = await probe()
results.hiResFetched = await page.evaluate(() =>
  performance.getEntriesByType('resource').some((r) => r.name.includes('8k')),
)

// Low: dpr should drop to 1 on this dpr-2 page.
await page.locator('.settings-popover').getByRole('button', { name: 'Low' }).click()
await page.waitForTimeout(800)
results.low = await probe()

// Persistence across reload.
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
results.afterReload = await probe()

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
