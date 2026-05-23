import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, 'token.json');

class GoogleSheetsHandler {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.oauth2Client = null;
    this.sheets = null;
    this.drive = null;
    this.loadSavedCredentials();
  }

  /**
   * Load saved credentials from token.json
   */
  loadSavedCredentials() {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const credentials = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        this.setCredentials(credentials);
        console.log('✓ Loaded saved credentials');
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error.message);
    }
  }

  /**
   * Initialize OAuth2 client
   */
  initializeOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
    return this.oauth2Client;
  }

  /**
   * Get authorization URL for user consent
   */
  getAuthorizationUrl() {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen for refresh token
    });
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code) {
    try {
      if (!this.oauth2Client) {
        this.initializeOAuth2Client();
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.setCredentials(tokens);
      return { success: true, message: 'Authentication successful' };
    } catch (error) {
      console.error('Error handling callback:', error.message);
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
  }

  /**
   * Set credentials and save to file
   */
  setCredentials(credentials) {
    if (!this.oauth2Client) {
      this.initializeOAuth2Client();
    }

    this.oauth2Client.setCredentials(credentials);
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    // Save credentials to file for future use
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      console.log('✓ Credentials saved to token.json');
    } catch (error) {
      console.error('Error saving credentials:', error.message);
    }
  }

  /**
   * Check if credentials are valid
   */
  isAuthenticated() {
    return this.oauth2Client && this.oauth2Client.credentials;
  }

  /**
   * Refresh access token if needed
   */
  async ensureAuthenticated() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please complete OAuth flow first.');
    }

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.setCredentials(credentials);
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      throw error;
    }
  }

  /**
   * Append records to Google Sheets
   */
  async appendToSheet(spreadsheetId, range, records) {
    try {
      await this.ensureAuthenticated();

      const values = records.map(record => Object.values(record));

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      console.log(`✓ Appended ${response.data.updates.updatedRows} rows to sheet`);
      return {
        success: true,
        updatedRows: response.data.updates.updatedRows,
        updatedCells: response.data.updates.updatedCells,
      };
    } catch (error) {
      this.handleApiError(error, 'appendToSheet');
    }
  }

  /**
   * Read data from Google Sheets
   */
  async readFromSheet(spreadsheetId, range) {
    try {
      await this.ensureAuthenticated();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const values = response.data.values || [];
      const headers = values[0] || [];
      const data = values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      console.log(`✓ Read ${data.length} records from sheet`);
      return {
        success: true,
        headers,
        data,
        rowCount: data.length,
      };
    } catch (error) {
      this.handleApiError(error, 'readFromSheet');
    }
  }

  /**
   * Update specific cells in Google Sheets
   */
  async updateSheet(spreadsheetId, range, values) {
    try {
      await this.ensureAuthenticated();

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      console.log(`✓ Updated ${response.data.updatedRows} rows in sheet`);
      return {
        success: true,
        updatedRows: response.data.updatedRows,
        updatedCells: response.data.updatedCells,
      };
    } catch (error) {
      this.handleApiError(error, 'updateSheet');
    }
  }

  /**
   * Clear a range in Google Sheets
   */
  async clearSheet(spreadsheetId, range) {
    try {
      await this.ensureAuthenticated();

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });

      console.log(`✓ Cleared range ${range}`);
      return { success: true };
    } catch (error) {
      this.handleApiError(error, 'clearSheet');
    }
  }

  /**
   * Upload image to Google Drive and get shareable link
   */
  async uploadImageToDrive(filePath, fileName, mimeType = 'image/jpeg', folderId = null) {
    try {
      await this.ensureAuthenticated();

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileMetadata = {
        name: fileName,
        mimeType,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = response.data.id;

      // Make the file publicly readable
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      console.log(`✓ Uploaded image: ${fileName} (${fileId})`);
      return {
        success: true,
        fileId,
        fileName,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        shareableLink: response.data.webViewLink,
      };
    } catch (error) {
      this.handleApiError(error, 'uploadImageToDrive');
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFileFromDrive(fileId) {
    try {
      await this.ensureAuthenticated();

      await this.drive.files.delete({ fileId });
      console.log(`✓ Deleted file from Drive: ${fileId}`);
      return { success: true };
    } catch (error) {
      this.handleApiError(error, 'deleteFileFromDrive');
    }
  }

  /**
   * Push local records to Google Sheets (sync)
   */
  async syncToSheet(spreadsheetId, range, records) {
    try {
      if (!records || records.length === 0) {
        return { success: true, message: 'No records to sync' };
      }

      // Clear existing data (optional - can be modified based on requirements)
      // await this.clearSheet(spreadsheetId, range);

      // Append new records
      return await this.appendToSheet(spreadsheetId, range, records);
    } catch (error) {
      this.handleApiError(error, 'syncToSheet');
    }
  }

  /**
   * Import data from Google Sheets to local storage
   */
  async importFromSheet(spreadsheetId, range) {
    try {
      const result = await this.readFromSheet(spreadsheetId, range);
      return result;
    } catch (error) {
      this.handleApiError(error, 'importFromSheet');
    }
  }

  /**
   * Two-way sync: compare local and sheet data
   */
  async twoWaySync(spreadsheetId, range, localRecords) {
    try {
      await this.ensureAuthenticated();

      // Get current sheet data
      const sheetData = await this.readFromSheet(spreadsheetId, range);
      if (!sheetData.success) {
        throw new Error('Failed to read sheet data');
      }

      // Compare and identify new records
      const existingIds = new Set(sheetData.data.map(item => item.id || ''));
      const newRecords = localRecords.filter(
        record => !existingIds.has(record.id || '')
      );

      let result = {
        success: true,
        sheetRecords: sheetData.data.length,
        localRecords: localRecords.length,
        newRecordsToAdd: newRecords.length,
        synced: 0,
      };

      // Append new records
      if (newRecords.length > 0) {
        const appendResult = await this.appendToSheet(
          spreadsheetId,
          range,
          newRecords
        );
        result.synced = appendResult.updatedRows;
      }

      return result;
    } catch (error) {
      this.handleApiError(error, 'twoWaySync');
    }
  }

  /**
   * Handle Google API errors with specific error codes
   */
  handleApiError(error, operation) {
    const errorCode = error.code || error.status;

    if (errorCode === 403) {
      const message = error.message || 'Permission denied';
      if (message.includes('Quota')) {
        console.error(`${operation}: API quota exceeded`);
        throw new Error(`API Quota Exceeded: ${message}`);
      }
      console.error(`${operation}: Permission denied`);
      throw new Error(`Permission Denied: ${message}`);
    }

    if (errorCode === 401) {
      console.error(`${operation}: Unauthorized - token may be invalid`);
      throw new Error('Unauthorized: Token is invalid or expired');
    }

    if (errorCode === 404) {
      console.error(`${operation}: Resource not found`);
      throw new Error('Not Found: Spreadsheet or file not found');
    }

    if (errorCode === 429) {
      console.error(`${operation}: Rate limited by Google API`);
      throw new Error('Rate Limited: Too many requests to Google API');
    }

    console.error(`${operation}: ${error.message}`);
    throw error;
  }

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheetInfo(spreadsheetId) {
    try {
      await this.ensureAuthenticated();

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return {
        success: true,
        title: response.data.properties.title,
        sheetCount: sheets.length,
        sheets: sheets.map(sheet => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          gridProperties: sheet.properties.gridProperties,
        })),
      };
    } catch (error) {
      this.handleApiError(error, 'getSpreadsheetInfo');
    }
  }
}

export default GoogleSheetsHandler;
