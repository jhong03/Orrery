// Verifies the dormant-comet coma fix and the info panel content.
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
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()
const focus = (id) =>
  page.evaluate((b) => window.__orrery.useSelectionStore.getState().focusBody(b), id)

// Dormant Halley today: should show a faint coma, not a bare ball + panel.
await focus('halley')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/facts-halley-dormant.png' })

// Titan: moon facts with the dense-atmosphere story.
await focus('titan')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/facts-titan.png' })

// Venus: atmosphere bars.
await focus('venus')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/facts-venus.png' })

const panelText = await page.locator('.info-panel').textContent()
const checks = {
  hasNextPerihelion: false,
  venusPressure: panelText.includes('92 bar'),
}
await focus('halley')
await page.waitForTimeout(1200)
const halleyText = await page.locator('.info-panel').textContent()
checks.hasNextPerihelion = halleyText.includes('28 Jul 2061')

console.log(JSON.stringify({ checks, errors }, null, 2))
await browser.close()
process.exit(errors.length || !checks.hasNextPerihelion ? 1 : 0)
