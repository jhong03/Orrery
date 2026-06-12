// Screenshots Jupiter and Neptune to verify their new faint ring systems.
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
const focus = (id) =>
  page.evaluate((b) => window.__orrery.useSelectionStore.getState().focusBody(b), id)

await focus('jupiter')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/rings-jupiter.png' })

await focus('neptune')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/rings-neptune.png' })

await focus('uranus')
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/rings-uranus.png' })

console.log(JSON.stringify({ errors }))
await browser.close()
process.exit(errors.length ? 1 : 0)
