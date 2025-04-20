const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startProcess: (files) => ipcRenderer.send('start-process', files),
   onProcessingDone: (callback) => ipcRenderer.on('processing-done', (event, data) => callback(data)),
  onProcessComplete: (callback) => ipcRenderer.on('process-complete', callback),
  generateZip: () => ipcRenderer.send('generate-zip'),
  onZipGenerated: (callback) => ipcRenderer.on('zip-generated', callback),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close')
});