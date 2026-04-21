import { ipcMain, clipboard, nativeImage, dialog } from 'electron'
import { promises as fs } from 'fs'
import screenshotManager from './screenshotManager.js'

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
}
