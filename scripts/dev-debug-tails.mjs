// Inspects the live scene: are the comet tail Points objects present, and
// what are their uniforms / draw state?
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (m) => errors.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => errors.push(`pageerror: ${e}`))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()
await page.evaluate(() => {
  const jd = Date.parse('2020-07-10T00:00:00Z') / 86400000 + 2440587.5
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSelectionStore.getState().focusBody('neowise')
})
await page.waitForTimeout(3000)

const report = await page.evaluate(() => {
  const out = []
  window.__scene.traverse((o) => {
    if (o.isPoints) {
      const m = o.material
      const u = m.uniforms ?? {}
      out.push({
        type: 'points',
        visible: o.visible,
        count: o.geometry.getAttribute('position')?.count,
        activity: u.uActivity?.value,
        axisLen: u.uAxis ? Math.hypot(u.uAxis.value.x, u.uAxis.value.y, u.uAxis.value.z) : null,
        nucleus: u.uNucleus
          ? [u.uNucleus.value.x, u.uNucleus.value.y, u.uNucleus.value.z].map((v) => v.toFixed(1))
          : null,
        pointScale: u.uPointScale?.value,
        compiled: !!m.program || 'unknown',
      })
    }
  })
  return out
})

console.log(JSON.stringify({ report, errors: errors.filter((e) => e.startsWith('[error')) }, null, 2))
await browser.close()
