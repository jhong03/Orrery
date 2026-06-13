// Verifies S5 integration: "Watch from ground" on an eclipse row enters
// surface mode at the right spot/time, and a city in Ctrl+K stands you there.
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
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const surf = () => page.evaluate(() => ({ ...window.__orrery.useSurfaceStore.getState() }))
const results = {}

// 1. Events -> Eclipses -> "Watch from ground" on the first row.
await page.getByRole('button', { name: 'Events' }).click()
await page.getByRole('tab', { name: 'Eclipses' }).click()
await page.waitForSelector('.events-list')
await page.locator('.event-ground').first().click()
await page.waitForTimeout(1500)
const s1 = await surf()
results.watchFromGround = {
  active: s1.active,
  place: s1.placeName,
  lat: +s1.latDeg.toFixed(1),
  lon: +s1.lonDeg.toFixed(1),
}
await page.screenshot({ path: 'scripts/tour/integration-watch.png' })

// Leave.
await page.getByRole('button', { name: 'Leave surface' }).click()
await page.waitForTimeout(600)

// 2. Ctrl+K -> "Tromsø" -> stand there.
await page.keyboard.press('Control+k')
await page.waitForSelector('.search-palette')
await page.keyboard.type('troms')
await page.waitForTimeout(200)
results.cityTopHit = await page.locator('.search-item-title').first().innerText()
await page.keyboard.press('Enter')
await page.waitForTimeout(800)
const s2 = await surf()
results.cityStand = { active: s2.active, place: s2.placeName, lat: +s2.latDeg.toFixed(1) }

results.pass =
  results.watchFromGround.active &&
  results.cityStand.active &&
  results.cityStand.place === 'Tromsø'

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
