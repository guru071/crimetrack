/**
 * Google Sheets API Client
 * Frontend utility for interacting with the backend Google Sheets API
 */

const API_BASE_URL = 'http://localhost:3001/api/sheets';

export class GoogleSheetsClient {
  constructor(basePath = API_BASE_URL) {
    this.basePath = basePath;
  }

  /**
   * Utility: Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.basePath}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, mergedOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error at ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ===== Authentication Methods =====

  /**
   * Get OAuth authorization URL
   */
  async getAuthorizationUrl() {
    return this.request('/auth/url');
  }

  /**
   * Send authorization code to backend
   */
  async handleAuthCallback(code) {
    return this.request('/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const result = await this.request('/auth/status');
      return result.authenticated;
    } catch (error) {
      return false;
    }
  }

  // ===== Sheets Data Methods =====

  /**
   * Push records to Google Sheets
   */
  async syncToSheet(spreadsheetId, range, records) {
    if (!records || records.length === 0) {
      throw new Error('Records array cannot be empty');
    }

    return this.request('/sync', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range, records }),
    });
  }

  /**
   * Pull data from Google Sheets
   */
  async fetchFromSheet(spreadsheetId, range) {
    const params = new URLSearchParams({
      spreadsheetId,
      range,
    });

    return this.request(`/fetch?${params}`);
  }

  /**
   * Import data from Google Sheets
   */
  async importFromSheet(spreadsheetId, range) {
    return this.request('/import', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range }),
    });
  }

  /**
   * Two-way sync between local and Sheets
   */
  async twoWaySync(spreadsheetId, range, localRecords) {
    if (!localRecords || !Array.isArray(localRecords)) {
      throw new Error('localRecords must be an array');
    }

    return this.request('/two-way-sync', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range, localRecords }),
    });
  }

  // ===== Google Drive Methods =====

  /**
   * Upload image to Google Drive (from file or base64)
   */
  async uploadImage(input, fileName, mimeType = 'image/jpeg', folderId = null) {
    let base64Data;

    // If input is a File object, convert to base64
    if (input instanceof File) {
      base64Data = await this.fileToBase64(input);
      fileName = input.name;
      mimeType = input.type;
    } else if (typeof input === 'string') {
      // Assume it's already base64
      base64Data = input;
    } else {
      throw new Error('Input must be File object or base64 string');
    }

    return this.request('/upload-image', {
      method: 'POST',
      body: JSON.stringify({ base64Data, fileName, mimeType, folderId }),
    });
  }

  /**
   * Delete image from Google Drive
   */
  async deleteImage(fileId) {
    return this.request('/delete-image', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }

  // ===== Utility Methods =====

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheetInfo(spreadsheetId) {
    const params = new URLSearchParams({ spreadsheetId });
    return this.request(`/info?${params}`);
  }

  /**
   * Check server health
   */
  async healthCheck() {
    return this.request('/health');
  }

  /**
   * Convert File to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert Canvas to base64
   */
  canvasToBase64(canvas, type = 'image/jpeg', quality = 0.8) {
    return canvas.toDataURL(type, quality).split(',')[1];
  }

  /**
   * Utility: Format records for Sheets
   */
  formatRecordsForSheets(records, fields) {
    return records.map(record => {
      const formatted = {};
      fields.forEach(field => {
        formatted[field] = record[field] || '';
      });
      return formatted;
    });
  }

  /**
   * Utility: Parse Sheets data
   */
  parseSheetData(sheetData, idField = 'id') {
    if (!sheetData || !sheetData.data) {
      return [];
    }

    return sheetData.data.map(row => ({
      id: row[idField] || `${Date.now()}-${Math.random()}`,
      ...row,
    }));
  }
}

// Export singleton instance
export const sheetsClient = new GoogleSheetsClient();

export default GoogleSheetsClient;
