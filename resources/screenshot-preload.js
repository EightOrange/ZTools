const { ipcRenderer } = require('electron')

window.__screenshotBridge = {
  onInit(callback) {
    ipcRenderer.on('screenshot-init', (_event, data) => callback(data))
  },
  cancel() {
    ipcRenderer.send('screenshot:cancel')
  },
  copyToClipboard(dataUrl) {
    return ipcRenderer.invoke('screenshot:copy-to-clipboard', dataUrl)
  },
  saveToFile(dataUrl) {
    return ipcRenderer.invoke('screenshot:save-to-file', dataUrl)
  }
}
