import { ipcMain, clipboard, nativeImage, dialog } from 'electron'
import { promises as fs } from 'fs'
import screenshotManager from './screenshotManager.js'
import ocrService from './ocrService.js'
import pinWindowManager from './pinWindowManager.js'

export function setupScreenshotIpc(): void {
  ipcMain.on('screenshot:cancel', () => {
    screenshotManager.closeAllOverlays()
  })

  ipcMain.handle('screenshot:copy-to-clipboard', async (_event, dataUrl: string) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      clipboard.writeImage(image)
      screenshotManager.closeAllOverlays()
      return { success: true }
    } catch (error) {
      console.error('[Screenshot] Copy to clipboard failed:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('screenshot:save-to-file', async (_event, dataUrl: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '保存截图',
        defaultPath: `screenshot-${Date.now()}.png`,
        filters: [
          { name: 'PNG', extensions: ['png'] },
          { name: 'JPEG', extensions: ['jpg', 'jpeg'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      const image = nativeImage.createFromDataURL(dataUrl)
      const isJpeg =
        result.filePath.toLowerCase().endsWith('.jpg') ||
        result.filePath.toLowerCase().endsWith('.jpeg')
      const buffer = isJpeg ? image.toJPEG(90) : image.toPNG()
      await fs.writeFile(result.filePath, buffer)

      screenshotManager.closeAllOverlays()
      return { success: true, path: result.filePath }
    } catch (error) {
      console.error('[Screenshot] Save to file failed:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('screenshot:ocr', async (_event, dataUrl: string, lang?: string) => {
    try {
      const result = await ocrService.recognize(dataUrl, lang || 'zh-Hans')
      return { success: true, ...result }
    } catch (error) {
      console.error('[Screenshot] OCR failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle('screenshot:pin', async (_event, dataUrl: string) => {
    try {
      screenshotManager.closeAllOverlays()
      const windowId = await pinWindowManager.createPinWindow(dataUrl)
      return { success: true, windowId }
    } catch (error) {
      console.error('[Screenshot] Pin failed:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.on('pin:restore-size', (event) => {
    const win = event.sender
    if (win) {
      const browserWindow = require('electron').BrowserWindow.fromWebContents(win)
      if (browserWindow) {
        const bounds = browserWindow.getBounds()
        browserWindow.setSize(bounds.width, bounds.height)
      }
    }
  })
}
