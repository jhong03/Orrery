// Verifies the error boundaries on the production build:
//  A) happy path — boundaries don't break normal rendering (canvas + HUD).
//  B) recovery — if the lazy SurfaceScene chunk fails to load, the surface
//     boundary drops back to orbit instead of crashing the whole app (no
//     full-screen crash card; orbit HUD + canvas survive).
// Console/page errors are EXPECTED in (B) (the chunk fetch is aborted), so
// this script asserts behaviour, not error-freeness.
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:4185/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function run(blockSurface) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  if (blockSurface) {
    // Fail every attempt to load the surface scene chunk (prefetch + on-demand).
    await page.route('**/SurfaceScene-*.js', (r) => r.abort())
  }
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('orrery.onboarded', '1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  // Reach the "Stand on the surface" button via the search palette + InfoPanel.
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(400)
  await page.locator('input[role="combobox"]').fill('Earth')
  await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2800) // flight
  await page.getByRole('button', { name: 'Stand on the surface' }).click()
  await page.waitForTimeout(3000)

  const out = {
    canvas: (await page.locator('canvas').count()) === 1,
    crashCard: (await page.locator('.crash').count()) === 1,
    surfaceHud: (await page.locator('.surface-hud').count()) === 1,
    orbitHud: (await page.locator('.hud').count()) === 1,
  }
  await page.close()
  return out
}

const happy = await run(false)
const recovered = await run(true)

// Expectations:
//  happy: surface mounts (surface-hud present), no crash card.
//  recovered: surface chunk failed -> boundary exited to orbit: no crash card,
//             no surface HUD, orbit HUD + canvas still alive.
const pass =
  happy.canvas &&
  happy.surfaceHud &&
  !happy.crashCard &&
  recovered.canvas &&
  !recovered.crashCard &&
  !recovered.surfaceHud &&
  recovered.orbitHud

console.log(JSON.stringify({ happy, recovered, pass }, null, 2))
await browser.close()
process.exit(pass ? 0 : 1)
