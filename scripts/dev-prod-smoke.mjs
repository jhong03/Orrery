// Production-build smoke: loads the preview build (no dev hooks) and exercises
// the lazy-loaded chunks through real UI — confirms the split chunks fetch and
// execute without console errors. Verifies: app/canvas boots, Events panel
// opens (lazy EventsPanel chunk), Ctrl+K search opens (eager), and standing on
// Earth via the InfoPanel loads the surface chunk and shows the surface HUD.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:4174/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const results = {}
results.canvas = (await page.locator('canvas').count()) === 1

// Events panel (lazy chunk) opens from the HUD button.
await page.getByRole('button', { name: 'Events' }).click()
await page.waitForSelector('.events-panel', { timeout: 4000 }).catch(() => {})
results.eventsPanel = (await page.locator('.events-panel').count()) === 1
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// Search palette (eager, owns the global shortcut) opens on Ctrl+K.
await page.keyboard.press('Control+k')
await page.waitForTimeout(500)
results.search = (await page.locator('input[role="combobox"]').count()) === 1
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// Stand on the surface: focus Earth, open its InfoPanel, click the toggle.
// This pulls the lazy SurfaceScene + SurfaceHud chunks.
await page.keyboard.press('Control+k')
await page.waitForTimeout(400)
await page.locator('input[role="combobox"]').fill('Earth')
await page.waitForTimeout(400)
await page.keyboard.press('Enter')
await page.waitForTimeout(2800) // flight
const standBtn = page.getByRole('button', { name: 'Stand on the surface' })
results.standButton = (await standBtn.count()) === 1
if (results.standButton) {
  await standBtn.click()
  await page.waitForTimeout(2500)
  results.surfaceHud = (await page.locator('.surface-hud').count()) === 1
  results.compass = (await page.locator('.compass-label').count()) === 4
}

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length || !results.canvas ? 1 : 0)
