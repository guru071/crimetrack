import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function isPlaceholder(value) {
  return !value || /your_|placeholder|replace_me|here/i.test(value);
}

export default class GoogleSheetsHandler {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.oauth2Client = null;
    this.sheets = null;
    this.drive = null;
    this.loadSavedCredentials();
  }

  get configured() {
    return !isPlaceholder(this.clientId) && !isPlaceholder(this.clientSecret) && !isPlaceholder(this.redirectUri);
  }

  assertConfigured() {
    if (!this.configured) {
      throw new Error('Google OAuth backend is not configured. Fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI, or use the Apps Script path in the frontend.');
    }
  }

  initializeOAuth2Client() {
    this.assertConfigured();
    if (!this.oauth2Client) {
      this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
    }
    return this.oauth2Client;
  }

  loadSavedCredentials() {
    if (!fs.existsSync(TOKEN_PATH)) return;
    try {
      const credentials = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      this.setCredentials(credentials);
    } catch (error) {
      console.warn('Could not load backend/token.json:', error.message);
    }
  }

  setCredentials(credentials) {
    this.initializeOAuth2Client();
    this.oauth2Client.setCredentials(credentials);
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
  }

  getAuthorizationUrl() {
    const client = this.initializeOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: REQUIRED_SCOPES,
      prompt: 'consent',
    });
  }

  async handleCallback(code) {
    if (!code) throw new Error('Authorization code is required');
    const client = this.initializeOAuth2Client();
    const { tokens } = await client.getToken(code);
    this.setCredentials(tokens);
    return { success: true, message: 'Authentication successful' };
  }

  isAuthenticated() {
    return !!(this.configured && this.oauth2Client?.credentials?.access_token);
  }

  async ensureAuthenticated() {
    if (!this.isAuthenticated()) {
      throw new Error('Google OAuth backend is not authenticated. Complete /api/sheets/auth/url first, or use Apps Script sync.');
    }
    return this.oauth2Client;
  }

  async readFromSheet(spreadsheetId, range) {
    await this.ensureAuthenticated();
    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values || [];
    const headers = values[0] || [];
    return {
      success: true,
      headers,
      data: values.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || '']))),
      rowCount: Math.max(values.length - 1, 0),
    };
  }

  async appendToSheet(spreadsheetId, range, records) {
    await this.ensureAuthenticated();
    const values = records.map(record => Object.values(record));
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return {
      success: true,
      updatedRows: response.data.updates?.updatedRows || 0,
      updatedCells: response.data.updates?.updatedCells || 0,
    };
  }

  async syncToSheet(spreadsheetId, range, records) {
    if (!Array.isArray(records) || records.length === 0) {
      return { success: true, message: 'No records to sync', updatedRows: 0 };
    }
    return this.appendToSheet(spreadsheetId, range, records);
  }

  async importFromSheet(spreadsheetId, range) {
    return this.readFromSheet(spreadsheetId, range);
  }

  async twoWaySync(spreadsheetId, range, localRecords) {
    const sheetData = await this.readFromSheet(spreadsheetId, range);
    const existingIds = new Set(sheetData.data.map(record => String(record.id || '')));
    const newRecords = (localRecords || []).filter(record => !existingIds.has(String(record.id || '')));
    const append = newRecords.length ? await this.appendToSheet(spreadsheetId, range, newRecords) : { updatedRows: 0 };
    return {
      success: true,
      sheetRecords: sheetData.data.length,
      localRecords: localRecords?.length || 0,
      newRecordsToAdd: newRecords.length,
      synced: append.updatedRows || 0,
    };
  }

  async deleteFileFromDrive(fileId) {
    await this.ensureAuthenticated();
    await this.drive.files.delete({ fileId });
    return { success: true };
  }

  async getSpreadsheetInfo(spreadsheetId) {
    await this.ensureAuthenticated();
    const response = await this.sheets.spreadsheets.get({ spreadsheetId });
    const sheets = response.data.sheets || [];
    return {
      success: true,
      title: response.data.properties?.title || '',
      sheetCount: sheets.length,
      sheets: sheets.map(sheet => ({
        id: sheet.properties.sheetId,
        title: sheet.properties.title,
        gridProperties: sheet.properties.gridProperties,
      })),
    };
  }
}
