// Electron main process. In dev it loads the Vite dev server (VITE_DEV_URL is
// set by scripts/electron-dev.mjs); when packaged it loads the built SPA from
// dist/ over file:// — which is why the production build uses a relative base
// (ELECTRON=true in vite.config) and runtime asset paths go through
// utils/asset.ts (import.meta.env.BASE_URL).
import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const devUrl = process.env.VITE_DEV_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#02030a',
    title: 'Orrery',
    show: false, // avoid a white flash; reveal once the renderer is ready
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Open any external links (attributions, etc.) in the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
