const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 850,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: true,
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.openDevTools();
}



app.whenReady().then(() => {
  createWindow();
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();});

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();});

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();});
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-process', (event, files) => {
    console.log('Received files in main process:', files);



    event.sender.send('process-complete', 'Processing completed successfully');
});

