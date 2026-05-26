const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

app.setName('C.A.S.E');

// Fix Google Sign-In
// Google blocks OAuth when it sees "Electron" in the User-Agent.
// Strip it so Google treats this as a normal Chrome browser.
app.userAgentFallback = app.userAgentFallback
  .replace(/ Electron\/[\d.]+/, '')
  .replace(/ CrimeTrack\/[\d.]+/, '');

// ─── LOCAL HTTP SERVER ─────────────────────────────────────────────────────────
// Firebase auth/unauthorized-domain fix:
// Firebase blocks logins from file:// origins. By serving the app on
// http://127.0.0.1:<port>, Firebase accepts it as "localhost" which IS allowed.
// Add "localhost" to Firebase Console → Authentication → Settings → Authorized Domains.
let localPort = 0;

function serveDistFolder() {
  const distDir = path.join(__dirname, '../dist');
  const mimeTypes = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff2':'font/woff2',
    '.woff': 'font/woff',
    '.ttf':  'font/ttf',
    '.bin':  'application/octet-stream',
    '.wasm': 'application/wasm',
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0]; // strip query string
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    let filePath = path.join(distDir, urlPath);

    // SPA fallback: serve index.html for unknown routes
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    // Port 0 = OS picks a random free port
    server.listen(0, '127.0.0.1', () => {
      localPort = server.address().port;
      console.log(`C.A.S.E local server running on http://127.0.0.1:${localPort}`);
      resolve(localPort);
    });
  });
}
// ──────────────────────────────────────────────────────────────────────────────

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: []
    }
  });

  win.once('ready-to-show', () => win.show());
  win.maximize();

  // Google OAuth popup handler
  // When Firebase opens a popup for Google Sign-In, open it in a new
  // BrowserWindow so Firebase can catch the result.
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Firebase/Google Auth popups inside Electron
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

    // Block localhost navigation (unless it's our own server)
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      if (!url.includes(`127.0.0.1:${port}`)) return { action: 'deny' };
    }

    // Open other external URLs in the system default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Strip Electron from User-Agent for all requests
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const ua = (details.requestHeaders['User-Agent'] || '')
      .replace(/ Electron\/[\d.]+/, '');
    details.requestHeaders['User-Agent'] = ua;
    callback({ requestHeaders: details.requestHeaders });
  });

  // Load via localhost instead of file:// — this is the Firebase auth fix!
  win.loadURL(`http://127.0.0.1:${port}`);

  // Permissions (camera, mic for face scanner)
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true); // grant all — camera/mic needed for face scan
  });
}

app.whenReady().then(async () => {
  // Patch the default session User-Agent
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.requestHeaders['User-Agent']) {
      details.requestHeaders['User-Agent'] = details.requestHeaders['User-Agent']
        .replace(/ Electron\/[\d.]+/, '');
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // Start local HTTP server FIRST, then create window
  const port = await serveDistFolder();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
