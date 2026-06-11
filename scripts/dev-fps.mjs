// Measures rendering FPS while idle and while scrubbing the timeline.
// Usage: node scripts/dev-fps.mjs [url]
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const measureFps = (ms) =>
  page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        let frames = 0
        const start = performance.now()
        const tick = () => {
          frames++
          if (performance.now() - start < duration) requestAnimationFrame(tick)
          else resolve((frames * 1000) / (performance.now() - start))
        }
        requestAnimationFrame(tick)
      }),
    ms,
  )

const idleFps = await measureFps(3000)

// Scrub continuously while measuring.
const tl = await page.locator('.timeline').boundingBox()
const cy = tl.y + tl.height / 2
await page.mouse.move(tl.x + 30, cy)
await page.mouse.down()
const fpsPromise = measureFps(3000)
for (let i = 0; i < 60; i++) {
  await page.mouse.move(tl.x + 30 + ((i * 7) % 300), cy)
  await page.waitForTimeout(40)
}
const scrubFps = await fpsPromise
await page.mouse.up()

console.log(JSON.stringify({ idleFps: idleFps.toFixed(1), scrubFps: scrubFps.toFixed(1) }))
await browser.close()
