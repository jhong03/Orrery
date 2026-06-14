// Dev launcher: start the Vite dev server programmatically, then spawn Electron
// pointing at it (VITE_DEV_URL). Keeps both alive; tearing down Electron closes
// the server. No extra orchestration deps (concurrently/wait-on) needed.
import electronPath from 'electron'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const server = await createServer({ server: { port: 5173 } })
await server.listen()
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173/'
console.log(`[electron-dev] Vite dev server at ${url}`)

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_URL: url },
})

let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  try {
    await server.close()
  } catch {
    // already closing
  }
  process.exit(0)
}

child.on('close', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
