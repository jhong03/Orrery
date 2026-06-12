// M4 verification: events panel, the 2026-08-12 umbra spot crawling across
// Earth (two frames apart), and the 2026-03-03 total lunar eclipse.
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

// 1. Events panel, eclipses tab.
await page.getByRole('button', { name: 'Events' }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scripts/tour/m4-events-eclipses.png' })

// 2. Jump to the total solar eclipse (2026-08-12): umbra spot on Earth.
const totalRow = page
  .locator('.event-item', { hasText: 'Total solar eclipse' })
  .first()
await totalRow.getByRole('button', { name: 'Jump to peak' }).click()
await page.waitForTimeout(3200) // flight + settle
await page.screenshot({ path: 'scripts/tour/m4-umbra-spot-1.png' })

// Let it play at 10 min/s so the spot crawls, then shoot again.
await page.waitForTimeout(5000)
await page.screenshot({ path: 'scripts/tour/m4-umbra-spot-2.png' })
await page.getByRole('button', { name: 'Pause' }).click()

// 3. Lunar eclipse 2026-03-03: rewind to Feb 2026 so it is upcoming again.
await page.evaluate(() => {
  const jd = Date.parse('2026-02-20T00:00:00Z') / 86400000 + 2440587.5
  window.__orrery.useTimeStore.getState().setJd(jd)
})
await page.waitForTimeout(1600) // list recompute (1 Hz tick)
const lunarRow = page
  .locator('.event-item', { hasText: 'Total lunar eclipse' })
  .first()
await lunarRow.getByRole('button', { name: 'Jump to peak' }).click()
await page.waitForTimeout(3200)
await page.screenshot({ path: 'scripts/tour/m4-lunar-eclipse.png' })
await page.getByRole('button', { name: 'Pause' }).click()

// 4. Showers tab (Perseids active on Aug 12 sim date from the solar jump...
//    we are now at Mar 2026; still lists all showers).
await page.getByRole('button', { name: 'Meteor showers' }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'scripts/tour/m4-showers.png' })

// 5. Comets tab.
await page.getByRole('button', { name: 'Comets', exact: true }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'scripts/tour/m4-comets.png' })

console.log(JSON.stringify({ errors }))
await browser.close()
process.exit(errors.length ? 1 : 0)
