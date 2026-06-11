// Two Jupiter screenshots half a rotation apart: the Great Red Spot must be
// visible in exactly one of them (verifies the texture longitude offset).
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()
await page.evaluate(() => window.__orrery.useSelectionStore.getState().focusBody('jupiter'))
await page.waitForTimeout(2600)
await page.screenshot({ path: 'scripts/tour/jupiter-a.png' })
// Advance half a Jupiter rotation (4.96 h).
await page.evaluate(() => {
  const s = window.__orrery.useTimeStore.getState()
  s.setJd(s.jd + 4.96 / 24)
})
await page.waitForTimeout(600)
await page.screenshot({ path: 'scripts/tour/jupiter-b.png' })
await browser.close()
console.log('done')
