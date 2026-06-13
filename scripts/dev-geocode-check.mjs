// Verifies reverse geocoding: standing at a known coordinate resolves to the
// right country/city in the surface HUD, and the precise coordinate shows.
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

const results = {}

// Paris coordinates (free pick, no placeName) -> should resolve to France.
await page.evaluate(() => window.__orrery.useSurfaceStore.getState().enter(48.857, 2.295))
await page.waitForSelector('.surface-place')
await page.waitForFunction(
  () => !document.querySelector('.surface-place')?.textContent?.includes('Locating'),
  { timeout: 8000 },
)
results.paris = {
  place: await page.locator('.surface-place').innerText(),
  coord: await page.locator('.surface-coord').innerText(),
}

// Mid-Pacific -> open ocean.
await page.evaluate(() => window.__orrery.useSurfaceStore.getState().enter(0, -150))
await page.waitForFunction(
  () => !document.querySelector('.surface-place')?.textContent?.includes('Locating'),
  { timeout: 8000 },
)
results.ocean = await page.locator('.surface-place').innerText()

results.pass =
  /France/i.test(results.paris.place) &&
  results.paris.coord.includes('48.857') &&
  /ocean/i.test(results.ocean)

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
