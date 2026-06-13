// Verifies the a11y pass: timeline keyboard scrubbing + aria values,
// Escape closes panels/popover, tab semantics, reduced-motion flight snap.
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
await page.evaluate(() => window.__orrery.useTimeStore.getState().setPlaying(false))

const results = {}
const jd = () => page.evaluate(() => window.__orrery.useTimeStore.getState().jd)

// 1. Timeline keyboard: arrow = 1 day, shift+arrow = 30 days.
const timeline = page.getByRole('slider')
await timeline.focus()
const jd0 = await jd()
await page.keyboard.press('ArrowRight')
const jd1 = await jd()
await page.keyboard.press('Shift+ArrowLeft')
const jd2 = await jd()
results.arrowDay = +(jd1 - jd0).toFixed(3)
results.shiftArrowMonth = +(jd2 - jd1).toFixed(3)
results.ariaValueText = await timeline.getAttribute('aria-valuetext')

// 2. Escape closes the events panel; tabs expose selection state.
await page.getByRole('button', { name: 'Events' }).click()
await page.waitForSelector('.events-panel')
results.tabSelected = await page
  .getByRole('tab', { name: 'Eclipses' })
  .getAttribute('aria-selected')
await page.keyboard.press('Escape')
await page.waitForTimeout(100)
results.eventsClosedByEsc = (await page.locator('.events-panel').count()) === 0

// 3. Escape with search open must close ONLY the search.
await page.getByRole('button', { name: 'Events' }).click()
await page.keyboard.press('Control+k')
await page.waitForSelector('.search-palette')
await page.keyboard.press('Escape')
await page.waitForTimeout(100)
results.searchClosedPanelKept =
  (await page.locator('.search-palette').count()) === 0 &&
  (await page.locator('.events-panel').count()) === 1
await page.keyboard.press('Escape') // now close the panel too

// 4. Reduced motion: camera flight arrives instantly (origin rebases same tick).
const reduced = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})
await reduced.goto(url, { waitUntil: 'networkidle' })
await reduced.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await reduced.reload({ waitUntil: 'networkidle' })
await reduced.waitForTimeout(2000)
await reduced.evaluate(() => window.__orrery.useSelectionStore.getState().focusBody('mars'))
await reduced.waitForTimeout(250) // a few frames, far below the 1.8 s flight
results.reducedMotionInstant = await reduced.evaluate(
  () => window.__orrery.useSelectionStore.getState().originBody === 'mars',
)

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
