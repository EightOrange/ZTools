import { BrowserWindow, app, nativeImage, Menu, clipboard } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'

interface PinWindowInfo {
  window: BrowserWindow
  imageDataUrl: string
  originalWidth: number
  originalHeight: number
}

class PinWindowManager {
  private pinWindows: PinWindowInfo[] = []

  async createPinWindow(
    imageDataUrl: string,
    bounds?: { width: number; height: number }
  ): Promise<number> {
    const img = nativeImage.createFromDataURL(imageDataUrl)
    const size = img.getSize()
    const width = bounds?.width || size.width
    const height = bounds?.height || size.height

    const maxWidth = 800
    const maxHeight = 600
    const scale = Math.min(1, maxWidth / width, maxHeight / height)
    const displayWidth = Math.round(width * scale)
    const displayHeight = Math.round(height * scale)

    const win = new BrowserWindow({
      width: displayWidth,
      height: displayHeight,
      frame: false,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      minimizable: true,
      maximizable: false,
      transparent: process.platform === 'darwin',
      backgroundColor: process.platform === 'darwin' ? undefined : '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '../../resources/screenshot-preload.js'),
        sandbox: false,
        contextIsolation: false,
        nodeIntegration: false
      }
    })

    const pinInfo: PinWindowInfo = {
      window: win,
      imageDataUrl,
      originalWidth: displayWidth,
      originalHeight: displayHeight
    }
    this.pinWindows.push(pinInfo)

    const tempDir = path.join(app.getPath('temp'), 'ztools-pin')
    await fs.mkdir(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, `pin-${Date.now()}.png`)
    await fs.writeFile(tempPath, img.toPNG())

    if (app.isPackaged) {
      const htmlPath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'internal-plugins',
        'screenshot',
        'pin.html'
      )
      win.loadFile(htmlPath)
    } else {
      win.loadURL('http://localhost:5178/pin.html')
    }

    win.webContents.once('did-finish-load', () => {
      win.webContents.send('pin-init', {
        filePath: tempPath,
        width: displayWidth,
        height: displayHeight
      })
    })

    this.setupContextMenu(win, pinInfo)
    this.setupWindowEvents(win, pinInfo)

    win.on('closed', () => {
      const idx = this.pinWindows.indexOf(pinInfo)
      if (idx !== -1) this.pinWindows.splice(idx, 1)
      fs.unlink(tempPath).catch(() => {})
    })

    return win.id
  }

  private setupContextMenu(win: BrowserWindow, info: PinWindowInfo): void {
    win.webContents.on('context-menu', () => {
      const menu = Menu.buildFromTemplate([
        {
          label: '复制到剪贴板',
          click: () => {
            const img = nativeImage.createFromDataURL(info.imageDataUrl)
            clipboard.writeImage(img)
          }
        },
        {
          label: '保存到文件...',
          click: async () => {
            const { dialog } = await import('electron')
            const result = await dialog.showSaveDialog(win, {
              title: '保存截图',
              defaultPath: `pin-${Date.now()}.png`,
              filters: [
                { name: 'PNG', extensions: ['png'] },
                { name: 'JPEG', extensions: ['jpg', 'jpeg'] }
              ]
            })
            if (!result.canceled && result.filePath) {
              const img = nativeImage.createFromDataURL(info.imageDataUrl)
              const isJpeg = result.filePath.endsWith('.jpg') || result.filePath.endsWith('.jpeg')
              const buffer = isJpeg ? img.toJPEG(90) : img.toPNG()
              await fs.writeFile(result.filePath, buffer)
            }
          }
        },
        { type: 'separator' },
        {
          label: '恢复原始大小',
          click: () => {
            win.setSize(info.originalWidth, info.originalHeight)
          }
        },
        {
          label: '置顶',
          type: 'checkbox',
          checked: win.isAlwaysOnTop(),
          click: () => {
            win.setAlwaysOnTop(!win.isAlwaysOnTop())
          }
        },
        { type: 'separator' },
        {
          label: '关闭',
          click: () => win.close()
        },
        {
          label: '关闭所有悬浮窗',
          click: () => this.closeAll()
        }
      ])
      menu.popup({ window: win })
    })
  }

  private setupWindowEvents(win: BrowserWindow, _info: PinWindowInfo): void {
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        win.close()
      }
    })
  }

  closeAll(): void {
    for (const info of [...this.pinWindows]) {
      if (!info.window.isDestroyed()) {
        info.window.close()
      }
    }
    this.pinWindows = []
  }

  getCount(): number {
    return this.pinWindows.length
  }

  cleanup(): void {
    this.closeAll()
    fs.rm(path.join(app.getPath('temp'), 'ztools-pin'), {
      recursive: true,
      force: true
    }).catch(() => {})
  }
}

export default new PinWindowManager()
