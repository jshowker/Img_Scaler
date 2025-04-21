// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

const REPLICATE_TOKEN = process.env.REPLICATE_TOKEN;

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
      enableRemoteModule: false,
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Главный IPC хэндлер для улучшения изображения
ipcMain.handle('enhance-image', async (event, dataUrl, scale = 2) => {
  try {
    const filePath = await saveDataURLToTempFile(dataUrl);
    const uploadUrl = await uploadToReplicate(filePath);
    const prediction = await runModel(uploadUrl, scale);
    const result = await waitForResult(prediction);

    if (result.status !== 'succeeded' || !result.output?.length) {
      throw new Error('Processing failed');
    }

    const base64 = await fetchImageAsBase64(result.output[0]);
    await fs.unlink(filePath);
    return base64;

  } catch (e) {
    console.error("Ошибка улучшения:", e);
    return null;
  }
});


function saveDataURLToTempFile(dataUrl) {
  return new Promise((resolve, reject) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return reject(new Error("Invalid DataURL"));

    const buffer = Buffer.from(matches[2], 'base64');
    const ext = matches[1].split("/")[1];
    const filePath = path.join(os.tmpdir(), `${uuidv4()}.${ext}`);

    require('fs').writeFile(filePath, buffer, (err) => {
      if (err) return reject(err);
      resolve(filePath);
    });
  });
}

// Загружаем на Replicate
async function uploadToReplicate(filePath) {
  const form = new FormData();
  form.append("file", require('fs').createReadStream(filePath));

  const res = await fetch("https://api.replicate.com/v1/upload", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`
    },
    body: form
  });

  const json = await res.json();
  return json.upload_url;
}

// Запуск модели
async function runModel(imageUrl, scale) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      input: {
        image: imageUrl,
        scale
      }
    })
  });

  return await res.json();
}

// Ожидание завершения
async function waitForResult(prediction) {
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`
      }
    });
    result = await res.json();
  }
  return result;
}

// Получение base64 результата
async function fetchImageAsBase64(imageUrl) {
  const res = await fetch(imageUrl);
  const buffer = await res.buffer();
  return buffer.toString('base64');
}
