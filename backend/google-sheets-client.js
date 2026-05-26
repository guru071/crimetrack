/**
 * Browser-safe client for the local Google Sheets backend.
 */

const API_BASE_URL = 'http://localhost:3001/api/sheets';

export class GoogleSheetsClient {
  constructor(basePath = API_BASE_URL) {
    this.basePath = basePath.replace(/\/$/, '');
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.basePath}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Google Sheets backend returned HTTP ${response.status}`);
    }
    return data;
  }

  getAuthorizationUrl() {
    return this.request('/auth/url');
  }

  handleAuthCallback(code) {
    return this.request('/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async isAuthenticated() {
    const result = await this.request('/auth/status');
    return !!result.authenticated;
  }

  syncToSheet(spreadsheetId, range, records) {
    return this.request('/sync', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range, records }),
    });
  }

  fetchFromSheet(spreadsheetId, range) {
    const params = new URLSearchParams({ spreadsheetId, range });
    return this.request(`/fetch?${params}`);
  }

  importFromSheet(spreadsheetId, range) {
    return this.request('/import', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range }),
    });
  }

  twoWaySync(spreadsheetId, range, localRecords) {
    return this.request('/two-way-sync', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, range, localRecords }),
    });
  }

  async uploadImage(input, fileName, mimeType = 'image/jpeg', folderId = null) {
    const base64Data = input instanceof File ? await this.fileToBase64(input) : input;
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Image upload requires a File or base64 string');
    }
    return this.request('/upload-image', {
      method: 'POST',
      body: JSON.stringify({
        base64Data,
        fileName: input instanceof File ? input.name : fileName,
        mimeType: input instanceof File ? input.type : mimeType,
        folderId,
      }),
    });
  }

  deleteImage(fileId) {
    return this.request('/delete-image', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }

  getSpreadsheetInfo(spreadsheetId) {
    const params = new URLSearchParams({ spreadsheetId });
    return this.request(`/info?${params}`);
  }

  healthCheck() {
    return this.request('/health');
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const sheetsClient = new GoogleSheetsClient();
export default GoogleSheetsClient;
