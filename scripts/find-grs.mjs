// Locates the Great Red Spot in the Jupiter texture (reddest cluster in the
// southern tropical band) and reports its texture longitude, used to set
// textureLonOffsetRad in data/planetRender.ts.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded' })

const result = await page.evaluate(async () => {
  const img = new Image()
  img.src = '/textures/jupiter.jpg'
  await img.decode()
  const W = 1024
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, W, H)
  const d = ctx.getImageData(0, 0, W, H).data
  // GRS latitude ~22 deg S -> v = 0.5 + 22/180 = 0.622. Scan v in [0.58, 0.68].
  let best = { score: -1, x: 0, y: 0 }
  for (let y = Math.floor(0.58 * H); y < Math.ceil(0.68 * H); y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      // Redness: strong R, suppressed G/B.
      const score = r - 0.6 * g - 0.6 * b
      if (score > best.score) best = { score, x, y }
    }
  }
  // Average a small neighborhood around the peak for stability.
  let sx = 0
  let n = 0
  for (let y = best.y - 6; y <= best.y + 6; y++) {
    for (let x = best.x - 10; x <= best.x + 10; x++) {
      const xx = (x + W) % W
      const i = (y * W + xx) * 4
      const score = d[i] - 0.6 * d[i + 1] - 0.6 * d[i + 2]
      if (score > best.score * 0.8) {
        sx += x
        n++
      }
    }
  }
  const cx = n ? sx / n : best.x
  const u = cx / W
  const v = best.y / H
  // Texture convention: u=0.5 is longitude 0, u increases eastward to u=0.75=90E.
  const lonEastDeg = (u - 0.5) * 360
  const latDeg = (0.5 - v) * 180
  return { u, v, lonEastDeg, latDeg, score: best.score }
})

console.log(JSON.stringify(result, null, 2))
await browser.close()
