import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { registerStorageHandlers } from './storage'
import { autoUpdater } from 'electron-updater'



// Register the custom scheme as privileged BEFORE app is ready —
// this must run at module load time, not inside whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])



function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    // Frameless on Windows/Linux for custom titlebar feel; native on macOS
   
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
   titleBarOverlay: {
      color: '#0f172a',       
      symbolColor: '#0f172a',  
      height: 100
    },
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the OS browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL('app://garage-app/index.html')
  }
}

app.whenReady().then(() => {
  // Register custom app:// protocol to serve the renderer in production
  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    // url.pathname is e.g. /index.html or /assets/index-abc.js
    const filePath = join(__dirname, '../renderer', url.pathname)
    return net.fetch(`file://${filePath}`)
  })

  // Register IPC token storage handlers
  registerStorageHandlers()

  createWindow()

  // Set up auto-updater (gracefully ignore errors in dev or without a publish config)
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.logger = console
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('Auto-updater check failed:', err.message)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
