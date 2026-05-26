import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import GoogleSheetsHandler from './google-sheets-handler.js';
import { uploadImageToDriveUsingServiceAccount } from './google-drive-service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DRIVE_UPLOAD_MODE = 'Apps Script or OAuth is recommended; service-account Drive uploads require Shared Drive or delegated access.';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

let sheetsHandler = null;

function getSheetsHandler() {
  if (!sheetsHandler) {
    sheetsHandler = new GoogleSheetsHandler(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  return sheetsHandler;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function missing(fields, body) {
  return fields.filter(field => body[field] === undefined || body[field] === null || body[field] === '');
}

function healthPayload() {
  const handler = getSheetsHandler();
  return {
    success: true,
    message: 'Google Sheets API server is running',
    port: Number(PORT),
    oauthConfigured: handler.configured,
    oauthAuthenticated: handler.isAuthenticated(),
    driveUploadMode: DRIVE_UPLOAD_MODE,
  };
}

app.get('/api/health', (req, res) => {
  res.json(healthPayload());
});

app.get('/api/sheets/health', (req, res) => {
  res.json(healthPayload());
});

app.get('/api/sheets/auth/url', (req, res, next) => {
  try {
    res.json({ success: true, authUrl: getSheetsHandler().getAuthorizationUrl() });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sheets/auth/callback', asyncRoute(async (req, res) => {
  const required = missing(['code'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });
  res.json(await getSheetsHandler().handleCallback(req.body.code));
}));

app.get('/api/sheets/auth/status', (req, res) => {
  const handler = getSheetsHandler();
  res.json({
    success: true,
    configured: handler.configured,
    authenticated: handler.isAuthenticated(),
  });
});

app.post('/api/sheets/sync', asyncRoute(async (req, res) => {
  const required = missing(['spreadsheetId', 'range', 'records'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });
  if (!Array.isArray(req.body.records)) return res.status(400).json({ success: false, error: 'records must be an array' });
  res.json(await getSheetsHandler().syncToSheet(req.body.spreadsheetId, req.body.range, req.body.records));
}));

app.get('/api/sheets/fetch', asyncRoute(async (req, res) => {
  const required = missing(['spreadsheetId', 'range'], req.query);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required query parameter: ${required.join(', ')}` });
  res.json(await getSheetsHandler().readFromSheet(req.query.spreadsheetId, req.query.range));
}));

app.post('/api/sheets/import', asyncRoute(async (req, res) => {
  const required = missing(['spreadsheetId', 'range'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });
  res.json(await getSheetsHandler().importFromSheet(req.body.spreadsheetId, req.body.range));
}));

app.post('/api/sheets/two-way-sync', asyncRoute(async (req, res) => {
  const required = missing(['spreadsheetId', 'range', 'localRecords'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });
  if (!Array.isArray(req.body.localRecords)) return res.status(400).json({ success: false, error: 'localRecords must be an array' });
  res.json(await getSheetsHandler().twoWaySync(req.body.spreadsheetId, req.body.range, req.body.localRecords));
}));

app.post('/api/sheets/upload-image', asyncRoute(async (req, res) => {
  const required = missing(['base64Data', 'fileName'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });

  const tempDir = path.join(process.cwd(), '.temp-uploads');
  fs.mkdirSync(tempDir, { recursive: true });
  const safeName = String(req.body.fileName).replace(/[^a-z0-9_.-]/gi, '_');
  const tempPath = path.join(tempDir, `${Date.now()}-${safeName}`);

  try {
    fs.writeFileSync(tempPath, Buffer.from(req.body.base64Data, 'base64'));
    res.json(await uploadImageToDriveUsingServiceAccount(
      tempPath,
      safeName,
      req.body.mimeType || 'image/jpeg',
      req.body.folderId
    ));
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}));

app.post('/api/sheets/delete-image', asyncRoute(async (req, res) => {
  const required = missing(['fileId'], req.body);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required field: ${required.join(', ')}` });
  res.json(await getSheetsHandler().deleteFileFromDrive(req.body.fileId));
}));

app.get('/api/sheets/info', asyncRoute(async (req, res) => {
  const required = missing(['spreadsheetId'], req.query);
  if (required.length) return res.status(400).json({ success: false, error: `Missing required query parameter: ${required.join(', ')}` });
  res.json(await getSheetsHandler().getSpreadsheetInfo(req.query.spreadsheetId));
}));

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found', path: req.path });
});

app.use((error, req, res, next) => {
  void req;
  void next;
  const message = error?.message || 'Internal server error';
  const status = /not configured|not authenticated/i.test(message) ? 503 : /quota/i.test(message) ? 429 : 500;
  res.status(status).json({ success: false, error: message });
});

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Google Sheets API server running on http://localhost:${PORT}`);
    console.log('Health: /api/health and /api/sheets/health');
  });
}

export default app;
