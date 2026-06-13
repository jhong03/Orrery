// Verifies the Ctrl+K search palette: open via keyboard, fuzzy ranking,
// Enter-to-focus, event jump, action execution, Esc/overlay close.
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

const results = {}

// 1. Ctrl+K opens; "jup" ranks Jupiter first; Enter focuses it.
await page.keyboard.press('Control+k')
await page.waitForSelector('.search-palette')
await page.keyboard.type('jup')
await page.waitForTimeout(150)
results.jupFirst = await page.locator('.search-item').first().innerText()
await page.screenshot({ path: 'scripts/tour/search-jup.png' })
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
results.paletteClosedAfterEnter = (await page.locator('.search-palette').count()) === 0
results.focusedAfterJup = await page.evaluate(
  () => window.__orrery.useSelectionStore.getState().focusedBody,
)

// 2. "/" opens; eclipse search shows dated events.
await page.keyboard.press('Escape') // harmless if nothing is open
await page.keyboard.press('/')
await page.waitForSelector('.search-palette')
await page.keyboard.type('eclipse')
await page.waitForTimeout(150)
results.eclipseTitles = await page.locator('.search-item-title').allInnerTexts()
await page.screenshot({ path: 'scripts/tour/search-eclipse.png' })

// 3. Esc closes.
await page.keyboard.press('Escape')
await page.waitForTimeout(100)
results.closedAfterEsc = (await page.locator('.search-palette').count()) === 0

// 4. Action item: switch scale mode.
const before = await page.evaluate(() => window.__orrery.useSettingsStore.getState().scaleMode)
await page.keyboard.press('Control+k')
await page.keyboard.type('realistic')
await page.waitForTimeout(150)
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
results.scaleSwitch = [
  before,
  await page.evaluate(() => window.__orrery.useSettingsStore.getState().scaleMode),
]

// 5. Meteor shower result deep-links the events panel to the Showers tab.
await page.keyboard.press('Control+k')
await page.keyboard.type('perseid')
await page.waitForTimeout(150)
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
results.showerLink = await page.evaluate(() => {
  const s = window.__orrery.useSettingsStore.getState()
  return { open: s.eventsPanelOpen, tab: s.eventsTab }
})

// 6. Overlay click closes.
await page.keyboard.press('Control+k')
await page.waitForSelector('.search-palette')
await page.mouse.click(40, 40)
await page.waitForTimeout(100)
results.closedAfterOverlayClick = (await page.locator('.search-palette').count()) === 0

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)

