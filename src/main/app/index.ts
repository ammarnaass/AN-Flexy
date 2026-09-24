import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { openDatabase } from '@main/core/db/client'
import { createSession } from '@main/core/session'
import { createLogger } from '@main/core/logger'
import { compose } from './compose'

// دورة حياة Electron + النافذة (RULES 2). يستورد الخصائص عبر compose فقط، لا مباشرة.

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      // preload يُبنى بصيغة CJS من electron.vite.config.ts (sandbox يتطلب CJS).
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // منع فتح النوافذ والتنقل الخارجي (RULES 8.3).
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.on('will-frame-navigate', (event) => event.preventDefault())

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function startApp(): void {
  app.whenReady().then(() => {
    const logger = createLogger()
    const file = join(app.getPath('userData'), 'anflexy.db')
    const migrationsFolder = app.isPackaged
      ? join(process.resourcesPath, 'migrations')
      : join(app.getAppPath(), 'src/main/core/db/migrations')

    const { db, sqlite } = openDatabase({ file, migrationsFolder })
    const session = createSession()
    const backupDir = join(app.getPath('userData'), 'backups')
    compose({ db, sqlite, session, logger, backupDir, activeDbPath: file })

    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
