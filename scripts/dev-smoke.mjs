// Dev-only smoke driver: opens the app in headless Edge, captures console
// errors, verifies the simulation clock advances, and saves screenshots of
// the key M1 states (system view, fly-to Earth, realistic scale).
// Usage: node scripts/dev-smoke.mjs [url]
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const readHud = async () => ({
  date: await page.locator('.hud-date').textContent(),
  time: await page.locator('.hud-time').textContent(),
})

const t1 = await readHud()
await page.screenshot({ path: 'scripts/smoke-1-sun.png' })

await page.waitForTimeout(2000)
const t2 = await readHud()

// Full-system overview (camera flight, visible scale).
await page.getByRole('button', { name: 'System view' }).click()
await page.waitForTimeout(2600)
await page.screenshot({ path: 'scripts/smoke-2-system.png' })

// Fly to Earth via its scene label (pause first: labels move while time plays).
await page.getByRole('button', { name: 'Pause' }).click()
await page.locator('.body-label', { hasText: 'Earth' }).first().click()
await page.waitForTimeout(2600)
await page.screenshot({ path: 'scripts/smoke-3-earth.png' })

// Realistic scale mode.
await page.locator('.hud-select').selectOption('realistic')
await page.waitForTimeout(800)
await page.screenshot({ path: 'scripts/smoke-4-earth-realistic.png' })

// Timeline scrub: drag right by 90px = ~3 months forward.
const beforeScrub = await readHud()
const tl = page.locator('.timeline')
const box = await tl.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 12 })
await page.mouse.up()
const afterScrub = await readHud()

const hasCanvas = await page.locator('canvas').count()

console.log(JSON.stringify({ t1, t2, beforeScrub, afterScrub, hasCanvas, errors }, null, 2))
await browser.close()

if (!hasCanvas || errors.length > 0 || JSON.stringify(t1) === JSON.stringify(t2)) {
  process.exit(1)
}
