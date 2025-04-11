const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startProcess: (files) => ipcRenderer.send('start-process', files),
    onProcessComplete: (callback) => ipcRenderer.on('process-complete', callback),
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close')
});l