// Close-up screenshots of the redesigned HUD (playing and paused states).
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

const hud = page.locator('.hud')
await hud.screenshot({ path: 'scripts/tour/hud-playing.png' })

// Paused + a toggle off + events active, to see all states.
await page.getByRole('button', { name: 'Pause' }).click()
await page.getByRole('button', { name: 'Events' }).click()
await page.getByRole('button', { name: 'Orbits' }).click()
await page.waitForTimeout(400)
await hud.screenshot({ path: 'scripts/tour/hud-paused.png' })

// Full-app context shot.
await page.screenshot({ path: 'scripts/tour/hud-context.png' })

console.log(JSON.stringify({ errors }))
await browser.close()
process.exit(errors.length ? 1 : 0)
