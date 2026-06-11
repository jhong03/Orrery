// Focuses every body in turn and saves a screenshot of each, for the M2
// self-critique pass. Pauses playback so framing is stable.
// Usage: node scripts/dev-tour.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const BODIES = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]

await mkdir('scripts/tour', { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()

for (const body of BODIES) {
  await page.evaluate((id) => window.__orrery.useSelectionStore.getState().focusBody(id), body)
  await page.waitForTimeout(2600) // flight + settle
  await page.screenshot({ path: `scripts/tour/${body}.png` })
  console.log(`shot ${body}`)
}

console.log(JSON.stringify({ errors }))
await browser.close()
process.exit(errors.length > 0 ? 1 : 0)
