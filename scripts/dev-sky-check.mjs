// Verifies S3 atmosphere: blue daytime sky, warm sunset, dark starry night,
// and that the sky alpha tracks Sun altitude. Screenshots at three times.
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

// London in summer; face east toward the rising/setting arc.
await page.evaluate(() => {
  window.__orrery.useTimeStore.getState().setPlaying(false)
  window.__orrery.useSurfaceStore.getState().enter(51.5, -0.1, { placeName: 'London' })
})
await page.waitForTimeout(2500)

// Average sky color in the upper third of the frame (above the horizon).
const skyColor = async () => {
  const buf = await page.screenshot({ clip: { x: 0, y: 80, width: 1440, height: 220 } })
  // Decode mean RGB via the page (canvas) to avoid extra deps.
  const b64 = buf.toString('base64')
  return page.evaluate(
    (data) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const px = ctx.getImageData(0, 0, img.width, img.height).data
          let r = 0,
            g = 0,
            bl = 0
          for (let i = 0; i < px.length; i += 4) {
            r += px[i]
            g += px[i + 1]
            bl += px[i + 2]
          }
          const n = px.length / 4
          resolve([Math.round(r / n), Math.round(g / n), Math.round(bl / n)])
        }
        img.src = 'data:image/png;base64,' + data
      }),
    b64,
  )
}

const results = {}

await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-06-21T12:00:00Z'))
await page.waitForTimeout(900)
results.noonSkyRGB = await skyColor()
await page.screenshot({ path: 'scripts/tour/sky-noon.png' })

// True sunset over London (~19:21 UTC); look down to the horizon glow.
await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-06-21T19:21:00Z'))
await page.waitForTimeout(600)
await page.mouse.move(720, 700)
await page.mouse.down()
await page.mouse.move(720, 430, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(500)
// Sample the horizon band (mid-lower frame) for warmth.
results.sunsetSkyRGB = await (async () => {
  const buf = await page.screenshot({ clip: { x: 0, y: 360, width: 1440, height: 220 } })
  const b64 = buf.toString('base64')
  return page.evaluate(
    (data) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const px = ctx.getImageData(0, 0, img.width, img.height).data
          let r = 0,
            g = 0,
            bl = 0
          for (let i = 0; i < px.length; i += 4) {
            r += px[i]
            g += px[i + 1]
            bl += px[i + 2]
          }
          const n = px.length / 4
          resolve([Math.round(r / n), Math.round(g / n), Math.round(bl / n)])
        }
        img.src = 'data:image/png;base64,' + data
      }),
    b64,
  )
})()
await page.screenshot({ path: 'scripts/tour/sky-sunset.png' })

await page.evaluate((jd) => window.__orrery.useTimeStore.getState().setJd(jd), jdOf('2026-06-21T01:00:00Z'))
await page.waitForTimeout(900)
results.nightSkyRGB = await skyColor()
await page.screenshot({ path: 'scripts/tour/sky-night.png' })

// Assertions: noon blue dominates, night dark, sunset warmer than noon.
const [nr, ng, nb] = results.noonSkyRGB
const [, , nightB] = results.nightSkyRGB
results.noonIsBlue = nb > nr && nb > 60
results.nightIsDark = nightB < 40
// Horizon band at sunset should be redder (higher R:B) than the noon zenith.
results.sunsetWarmerThanNoon =
  results.sunsetSkyRGB[0] / (results.sunsetSkyRGB[2] + 1) > nr / (nb + 1)

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)

