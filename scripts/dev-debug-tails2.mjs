// Polls comet activity inputs across frames to find why uActivity reads 0.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await page.getByRole('button', { name: 'Pause' }).click()
await page.evaluate(() => {
  const jd = Date.parse('2020-07-10T00:00:00Z') / 86400000 + 2440587.5
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSelectionStore.getState().focusBody('neowise')
})
await page.waitForTimeout(3000)

const report = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const KM_PER_AU = 149597870.7
      const samples = []
      let n = 0
      const tick = () => {
        const f = window.__orrery.frame
        const jdStore = window.__orrery.useTimeStore.getState().jd
        const p = f.sys.neowise
        const rAu = Math.hypot(p.x, p.y, p.z) / KM_PER_AU
        let act = null
        window.__scene.traverse((o) => {
          if (o.isPoints && o.material.uniforms?.uActivity && act === null) {
            // first tail found
            act = o.material.uniforms.uActivity.value
          }
        })
        samples.push({ frameJd: f.jd.toFixed(3), storeJd: jdStore.toFixed(3), rAu: rAu.toFixed(3), firstTailActivity: act })
        if (++n < 6) requestAnimationFrame(tick)
        else resolve(samples)
      }
      requestAnimationFrame(tick)
    }),
)

console.log(JSON.stringify(report, null, 2))
await browser.close()
