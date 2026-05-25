const { app, BrowserWindow } = require('electron');
const path = require('path');

app.setName('C.A.S.E');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.once('ready-to-show', () => win.show());
  win.maximize();
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // Automatically grant camera and microphone permissions so Moto Smart Connect and USB cams work flawlessly
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(true);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
