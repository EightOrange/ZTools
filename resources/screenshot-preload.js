const { ipcRenderer } = require('electron')
const fs = require('fs')

window.__screenshotBridge = {
  onInit(callback) {
    ipcRenderer.on('screenshot-init', (_event, data) => callback(data))
  },
  readFileAsDataUrl(filePath) {
    try {
      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      return `data:image/png;base64,${base64}`
    } catch (err) {
      console.error('[screenshot-preload] Failed to read file:', err)
      return ''
    }
  },
  cancel() {
    ipcRenderer.send('screenshot:cancel')
  },
  copyToClipboard(dataUrl) {
    return ipcRenderer.invoke('screenshot:copy-to-clipboard', dataUrl)
  },
  saveToFile(dataUrl) {
    return ipcRenderer.invoke('screenshot:save-to-file', dataUrl)
  },
  ocr(dataUrl, lang) {
    return ipcRenderer.invoke('screenshot:ocr', dataUrl, lang)
  },
  pin(dataUrl) {
    return ipcRenderer.invoke('screenshot:pin', dataUrl)
  },
  longScreenshotStart(options) {
    return ipcRenderer.invoke('screenshot:long-start', options)
  },
  longScreenshotStop() {
    ipcRenderer.send('screenshot:long-stop')
  },
  onLongScreenshotProgress(callback) {
    ipcRenderer.on('screenshot:long-progress', (_event, progress) => callback(progress))
  }
}
