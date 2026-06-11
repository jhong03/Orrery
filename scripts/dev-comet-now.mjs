// Reproduce the user experience: focus each comet at TODAY's date and at its
// own perihelion, and report activity values.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()

const KM_PER_AU = 149597870.7
const info = await page.evaluate((kmAu) => {
  const f = window.__orrery.frame
  const out = {}
  for (const id of ['halley', 'encke', 'cg67p', 'neowise']) {
    const p = f.sys[id]
    out[id] = (Math.hypot(p.x, p.y, p.z) / kmAu).toFixed(2) + ' au'
  }
  return out
}, KM_PER_AU)
console.log('heliocentric distances today:', JSON.stringify(info))

await page.evaluate(() => window.__orrery.useSelectionStore.getState().focusBody('halley'))
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/comet-halley-today.png' })

// Encke near its 2027-02 perihelion.
await page.evaluate(() => {
  window.__orrery.useTimeStore.getState().setJd(2461447.5) // 2027-02-06
  window.__orrery.useSelectionStore.getState().focusBody('encke')
})
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scripts/tour/comet-encke-peri.png' })

await browser.close()
console.log('done')
