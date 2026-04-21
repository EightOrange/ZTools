import { BrowserWindow, app, desktopCapturer, globalShortcut, screen } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'
import databaseAPI from '../api/shared/database.js'

const DEFAULT_HOTKEY = 'Ctrl+Shift+A'

class ScreenshotManager {
  private overlayWindows: BrowserWindow[] = []
  private hotkey: string = DEFAULT_HOTKEY

  init(): void {
    this.registerHotkey()
  }

  private registerHotkey(): void {
    try {
      const settings = databaseAPI.dbGet('settings-general')
      this.hotkey = settings?.screenshotHotkey || DEFAULT_HOTKEY

      if (globalShortcut.isRegistered(this.hotkey)) {
        console.warn(`[Screenshot] Hotkey ${this.hotkey} is already registered, skipping`)
        return
      }

      const success = globalShortcut.register(this.hotkey, () => {
        this.startCapture()
      })

      if (success) {
        console.log(`[Screenshot] Hotkey registered: ${this.hotkey}`)
      } else {
        console.warn(`[Screenshot] Failed to register hotkey: ${this.hotkey}`)
      }
    } catch (error) {
      console.error('[Screenshot] Error registering hotkey:', error)
    }
  }

  async startCapture(): Promise<void> {
    try {
      this.closeAllOverlays()

      const displays = screen.getAllDisplays()
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.max(...displays.map((d) => d.size.width * d.scaleFactor)),
          height: Math.max(...displays.map((d) => d.size.height * d.scaleFactor))
        }
      })

      const tempDir = path.join(app.getPath('temp'), 'ztools-screenshot')
      await fs.mkdir(tempDir, { recursive: true })

      for (const display of displays) {
        const source = sources.find((s) => s.display_id === String(display.id)) || sources[0]

        if (source) {
          const tempPath = path.join(tempDir, `capture-${display.id}.png`)
          await fs.writeFile(tempPath, source.thumbnail.toPNG())
          this.createOverlayWindow(display, tempPath)
        }
      }
    } catch (error) {
      console.error('[Screenshot] Capture failed:', error)
    }
  }

  private createOverlayWindow(display: Electron.Display, screenshotFilePath: string): void {
    const { bounds } = display

    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../resources/screenshot-preload.js'),
        sandbox: false,
        contextIsolation: false,
        nodeIntegration: false
      }
    }

    if (process.platform === 'darwin') {
      windowConfig.transparent = true
    } else {
      windowConfig.backgroundColor = '#00000000'
    }

    const overlay = new BrowserWindow(windowConfig)
    overlay.setVisibleOnAllWorkspaces(true)

    if (app.isPackaged) {
      const pluginHtmlPath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'internal-plugins',
        'screenshot',
        'index.html'
      )
      overlay.loadFile(pluginHtmlPath)
    } else {
      overlay.loadURL('http://localhost:5178')
    }

    overlay.webContents.once('did-finish-load', () => {
      overlay.webContents.send('screenshot-init', {
        filePath: screenshotFilePath,
        displayBounds: bounds,
        scaleFactor: display.scaleFactor
      })
      overlay.show()
    })

    overlay.on('closed', () => {
      const index = this.overlayWindows.indexOf(overlay)
      if (index !== -1) this.overlayWindows.splice(index, 1)
    })

    this.overlayWindows.push(overlay)
  }

  closeAllOverlays(): void {
    for (const win of [...this.overlayWindows]) {
      if (!win.isDestroyed()) win.close()
    }
    this.overlayWindows = []

    this.cleanupTempFiles()
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(app.getPath('temp'), 'ztools-screenshot')
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Temp cleanup is best-effort
    }
  }

  cleanup(): void {
    this.closeAllOverlays()
    if (this.hotkey) {
      try {
        globalShortcut.unregister(this.hotkey)
      } catch {
        // ignore
      }
    }
  }
}

export default new ScreenshotManager()
