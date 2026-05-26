const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

app.setName('C.A.S.E');

//  Fix Google Sign-In
// Google blocks OAuth when it sees "Electron" in the User-Agent.
// Strip it so Google treats this as a normal Chrome browser.
app.userAgentFallback = app.userAgentFallback
  .replace(/ Electron\/[\d.]+/, '')
  .replace(/ CrimeTrack\/[\d.]+/, '');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Override User-Agent per webContents too
      additionalArguments: []
    }
  });

  win.once('ready-to-show', () => win.show());
  win.maximize();

  //  Google OAuth popup handler
  // When Firebase opens a popup for Google Sign-In, open it in a new
  // BrowserWindow (not the system browser) so Firebase can catch the result.
  // Remove Electron from its User-Agent too so Google accepts the request.
  win.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a localhost dev server URL, deny it
    if (url.startsWith('http://localhost') && !url.includes('firebaseapp.com')) {
      return { action: 'deny' };
    }

    // Always open Firebase/Google Auth popups inside a secure Electron window!
    if (url.includes('google.com') || url.includes('firebaseapp.com') || url.includes('oauth')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          }
        }
      };
    }

    // Open other external URLs in the system default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  //  Strip Electron from User-Agent for all requests
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const ua = (details.requestHeaders['User-Agent'] || '')
      .replace(/ Electron\/[\d.]+/, '');
    details.requestHeaders['User-Agent'] = ua;
    callback({ requestHeaders: details.requestHeaders });
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));

  //  Permissions (camera, mic for face scanner)
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true); // grant all  camera/mic needed for face scan
  });
}

app.whenReady().then(() => {
  // Also patch the default session User-Agent
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.requestHeaders['User-Agent']) {
      details.requestHeaders['User-Agent'] = details.requestHeaders['User-Agent']
        .replace(/ Electron\/[\d.]+/, '');
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
