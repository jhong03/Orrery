// Verifies onboarding: shows on first visit, three steps, persists dismissal.
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
await page.evaluate(() => localStorage.removeItem('orrery.onboarded'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const results = {}
results.step1 = await page.locator('.coach-title').innerText()
await page.screenshot({ path: 'scripts/tour/onboarding-1.png' })
await page.getByRole('button', { name: 'Next' }).click()
results.step2 = await page.locator('.coach-title').innerText()
await page.screenshot({ path: 'scripts/tour/onboarding-2.png' })
await page.getByRole('button', { name: 'Next' }).click()
results.step3 = await page.locator('.coach-title').innerText()
await page.screenshot({ path: 'scripts/tour/onboarding-3.png' })
await page.getByRole('button', { name: 'Done' }).click()
results.closedAfterDone = (await page.locator('.coach').count()) === 0

await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
results.staysHiddenAfterReload = (await page.locator('.coach').count()) === 0

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
