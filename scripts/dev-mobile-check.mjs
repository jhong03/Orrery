// Verifies mobile: responsive layout, two-finger horizontal time scrub vs
// pinch zoom classification (synthesized touch pointer events).
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
})
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => {
  // Synthetic touch pointers are never captured by the browser, so
  // OrbitControls' releasePointerCapture throws — real devices don't.
  if (String(e).includes('releasePointerCapture')) return
  errors.push(String(e))
})

await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

await page.screenshot({ path: 'scripts/tour/mobile-layout.png' })

// Helper: dispatch a synthetic two-finger gesture on the canvas.
const gesture = (moves) =>
  page.evaluate((steps) => {
    const el = document.querySelector('canvas')
    const fire = (type, id, x, y) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
          isPrimary: id === 1,
        }),
      )
    const [a0, b0] = steps[0]
    fire('pointerdown', 1, a0[0], a0[1])
    fire('pointerdown', 2, b0[0], b0[1])
    for (const [a, b] of steps.slice(1)) {
      fire('pointermove', 1, a[0], a[1])
      fire('pointermove', 2, b[0], b[1])
    }
    const [aN, bN] = steps[steps.length - 1]
    fire('pointerup', 1, aN[0], aN[1])
    fire('pointerup', 2, bN[0], bN[1])
  }, moves)

const state = () =>
  page.evaluate(() => ({
    jd: window.__orrery.useTimeStore.getState().jd,
    playing: window.__orrery.useTimeStore.getState().playing,
  }))

const results = {}

// Pause so background playback doesn't pollute jd deltas.
await page.evaluate(() => window.__orrery.useTimeStore.getState().setPlaying(false))

// 1. Two-finger horizontal drag: jd should move ~ (120/390)*365 ≈ 112 days.
const before = await state()
const scrubSteps = []
for (let i = 0; i <= 12; i++) {
  const dx = i * 10
  scrubSteps.push([
    [120 + dx, 400],
    [180 + dx, 400],
  ])
}
await gesture(scrubSteps)
await page.waitForTimeout(200)
const after = await state()
results.scrubDeltaDays = after.jd - before.jd
// 2. Pinch (fingers diverge): jd must NOT move.
const beforePinch = await state()
const pinchSteps = []
for (let i = 0; i <= 12; i++) {
  pinchSteps.push([
    [195 - 20 - i * 8, 400],
    [195 + 20 + i * 8, 400],
  ])
}
await gesture(pinchSteps)
await page.waitForTimeout(200)
const afterPinch = await state()
results.pinchJdDelta = afterPinch.jd - beforePinch.jd

console.log(JSON.stringify({ results, errors }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
