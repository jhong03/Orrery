// Verifies S4 auroras: the curtain lights up at high geomagnetic latitude on
// a dark night and stays dark near the equator. Kp comes from NOAA (cached,
// fail-safe to a climatological baseline so the test works offline too).
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

const jdOf = (iso) => new Date(iso).getTime() / 86400000 + 2440587.5

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

// Intensity uniform of the aurora curtain (cylinder geometry).
const auroraIntensity = () =>
  page.evaluate(() => {
    let val = -1
    window.__scene.traverse((o) => {
      const g = o.geometry
      if (g && g.type === 'CylinderGeometry' && o.material?.uniforms?.uIntensity) {
        val = o.material.uniforms.uIntensity.value
      }
    })
    return val
  })

const results = {}

// High geomagnetic latitude (Arctic Canada), polar-night midnight.
await page.evaluate((jd) => {
  window.__orrery.useTimeStore.getState().setPlaying(false)
  window.__orrery.useTimeStore.getState().setJd(jd)
  window.__orrery.useSurfaceStore.getState().enter(70, -90, { placeName: 'Nunavut', lookAt: 'sun-az' })
}, jdOf('2026-12-21T06:00:00Z'))
await page.waitForTimeout(2500) // allow the Kp fetch + a few frames
results.arcticNight = +(await auroraIntensity()).toFixed(3)
await page.screenshot({ path: 'scripts/tour/aurora-arctic.png' })

// Equator at night: no auroras.
await page.evaluate(() => window.__orrery.useSurfaceStore.getState().enter(2, -90, { placeName: 'Equator' }))
await page.waitForTimeout(900)
results.equatorNight = +(await auroraIntensity()).toFixed(3)

results.pass = results.arcticNight > 0.05 && results.equatorNight <= 0.01

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
