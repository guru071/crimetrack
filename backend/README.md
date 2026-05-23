# Google Sheets API Backend Service

A production-ready Node.js backend service for Google Sheets API integration, with support for OAuth 2.0 authentication, data sync, and Google Drive image uploads.

## Features

✅ **OAuth 2.0 Authentication**
- Secure Google authentication flow
- Automatic token refresh
- Credentials persisted locally (for development)

✅ **Google Sheets Operations**
- Append records (sync)
- Read/fetch data
- Update cells
- Clear ranges
- Two-way sync with conflict detection

✅ **Google Drive Integration**
- Upload images with shareable links
- Automatic permission management
- File deletion support

✅ **Production Ready**
- Comprehensive error handling
- API quota management
- Request logging
- CORS support
- Health check endpoint

✅ **Developer Friendly**
- Clear API documentation
- Frontend client library included
- Environment-based configuration
- Detailed error messages

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/sheets/auth/callback
GOOGLE_SHEETS_ID=your_spreadsheet_id
```

### 3. Run the Server

```bash
node backend/server.js
```

Server starts at `http://localhost:3001`

## Architecture

```
backend/
├── server.js                    # Express server & API endpoints
├── google-sheets-handler.js     # Core Google Sheets & Drive logic
├── google-sheets-client.js      # Frontend client utility
├── token.json                   # OAuth tokens (auto-generated)
├── SETUP.md                     # Detailed setup guide
└── README.md                    # This file
```

### Core Components

**GoogleSheetsHandler** (`google-sheets-handler.js`)
- Manages OAuth 2.0 client
- Handles all Sheets operations
- Manages Drive uploads
- Implements error handling

**Express Server** (`server.js`)
- RESTful API endpoints
- Request/response handling
- Error middleware
- CORS support

**Frontend Client** (`google-sheets-client.js`)
- Browser-side API wrapper
- File upload utilities
- Response parsing

## API Documentation

### Authentication Endpoints

#### GET `/api/sheets/auth/url`
Get OAuth authorization URL.

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Visit this URL to authorize the application"
}
```

#### POST `/api/sheets/auth/callback`
Handle OAuth callback after user authorization.

**Body:**
```json
{
  "code": "authorization_code_from_google"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful"
}
```

#### GET `/api/sheets/auth/status`
Check if user is authenticated.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authenticated"
}
```

---

### Sheets Data Endpoints

#### POST `/api/sheets/sync`
Push local records to Google Sheets (append mode).

**Body:**
```json
{
  "spreadsheetId": "1a2b3c...",
  "range": "Sheet1!A:Z",
  "records": [
    {"Name": "John Doe", "Status": "Active", "Date": "2024-01-15"},
    {"Name": "Jane Smith", "Status": "Inactive", "Date": "2024-01-14"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updatedRows": 2,
  "updatedCells": 6
}
```

#### GET `/api/sheets/fetch`
Pull data from Google Sheets.

**Query Parameters:**
- `spreadsheetId` - (required) Spreadsheet ID
- `range` - (required) Range to fetch (e.g., "Sheet1!A:Z")

**Example:**
```
GET /api/sheets/fetch?spreadsheetId=1a2b3c&range=Sheet1!A:Z
```

**Response:**
```json
{
  "success": true,
  "headers": ["Name", "Status", "Date"],
  "data": [
    {"Name": "John Doe", "Status": "Active", "Date": "2024-01-15"},
    {"Name": "Jane Smith", "Status": "Inactive", "Date": "2024-01-14"}
  ],
  "rowCount": 2
}
```

#### POST `/api/sheets/import`
Import data from Google Sheets to local storage.

**Body:**
```json
{
  "spreadsheetId": "1a2b3c...",
  "range": "Sheet1!A:Z"
}
```

**Response:**
```json
{
  "success": true,
  "headers": ["Name", "Status", "Date"],
  "data": [...]
}
```

#### POST `/api/sheets/two-way-sync`
Two-way sync with conflict detection.

**Body:**
```json
{
  "spreadsheetId": "1a2b3c...",
  "range": "Sheet1!A:Z",
  "localRecords": [
    {"id": "rec-1", "Name": "John", "Status": "Active"},
    {"id": "rec-2", "Name": "New Person", "Status": "Pending"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "sheetRecords": 5,
  "localRecords": 2,
  "newRecordsToAdd": 1,
  "synced": 1
}
```

---

### Google Drive Endpoints

#### POST `/api/sheets/upload-image`
Upload image to Google Drive.

**Body:**
```json
{
  "base64Data": "iVBORw0KGgoAAAANS...",
  "fileName": "evidence-photo.jpg",
  "mimeType": "image/jpeg",
  "folderId": "folder-id-optional"
}
```

**Response:**
```json
{
  "success": true,
  "fileId": "drive-file-id",
  "fileName": "evidence-photo.jpg",
  "webViewLink": "https://drive.google.com/file/d/...",
  "shareableLink": "https://drive.google.com/file/d/..."
}
```

#### POST `/api/sheets/delete-image`
Delete image from Google Drive.

**Body:**
```json
{
  "fileId": "drive-file-id"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Utility Endpoints

#### GET `/api/sheets/info`
Get spreadsheet metadata.

**Query Parameters:**
- `spreadsheetId` - (required) Spreadsheet ID

**Response:**
```json
{
  "success": true,
  "title": "Crime Records",
  "sheetCount": 3,
  "sheets": [
    {
      "id": 0,
      "title": "Reports",
      "gridProperties": {"rowCount": 1000, "columnCount": 26}
    }
  ]
}
```

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Google Sheets API server is running",
  "port": 3001
}
```

---

## Frontend Integration

### Using the Client Library

```javascript
import GoogleSheetsClient from './backend/google-sheets-client.js';

const client = new GoogleSheetsClient();

// 1. Authenticate
const authUrl = await client.getAuthorizationUrl();
window.open(authUrl); // User authorizes in browser
// After authorization:
await client.handleAuthCallback(authCode);

// 2. Sync data to Sheets
const records = [
  { id: 1, name: "Report A", status: "Active" },
  { id: 2, name: "Report B", status: "Pending" }
];
const result = await client.syncToSheet(
  'spreadsheet-id',
  'Sheet1!A:Z',
  records
);

// 3. Fetch data from Sheets
const data = await client.fetchFromSheet('spreadsheet-id', 'Sheet1!A:Z');
console.log(data.data);

// 4. Upload image
const file = document.querySelector('input[type="file"]').files[0];
const uploadResult = await client.uploadImage(file, file.name);
console.log(uploadResult.shareableLink);

// 5. Two-way sync
const syncResult = await client.twoWaySync(
  'spreadsheet-id',
  'Sheet1!A:Z',
  localRecords
);
```

### Example: React Component

```jsx
import React, { useState, useEffect } from 'react';
import GoogleSheetsClient from './backend/google-sheets-client.js';

const SheetsSync = () => {
  const [client] = useState(() => new GoogleSheetsClient());
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = await client.isAuthenticated();
    setAuthenticated(isAuth);
  };

  const handleAuth = async () => {
    const { authUrl } = await client.getAuthorizationUrl();
    window.open(authUrl);
    // After user returns from Google
    setTimeout(() => checkAuth(), 2000);
  };

  const fetchData = async () => {
    const result = await client.fetchFromSheet(
      'your-spreadsheet-id',
      'Sheet1!A:Z'
    );
    setData(result.data);
  };

  return (
    <div>
      {!authenticated ? (
        <button onClick={handleAuth}>Authenticate with Google</button>
      ) : (
        <>
          <button onClick={fetchData}>Load Data</button>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </div>
  );
};

export default SheetsSync;
```

## Error Handling

### Common Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| API Quota Exceeded | 429 | Too many requests | Wait and retry with exponential backoff |
| Unauthorized | 401 | Invalid/expired token | Re-authenticate with OAuth flow |
| Permission Denied | 403 | Missing scopes or access | Check permissions, re-authenticate |
| Not Found | 404 | Spreadsheet/file doesn't exist | Verify IDs are correct |
| Not Authenticated | 400 | No valid credentials | Complete OAuth flow |

### Error Response Format

```json
{
  "success": false,
  "error": "API Quota Exceeded: This action exceeds quota..."
}
```

---

## Configuration

### Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/sheets/auth/callback

# Sheets
GOOGLE_SHEETS_ID=1a2b3c...

# Server
PORT=3001
NODE_ENV=development
```

### Token Storage

OAuth tokens are automatically saved to `backend/token.json`:
- Contains access and refresh tokens
- **Never commit to version control**
- Automatically refreshed before expiry
- Can be deleted to force re-authentication

---

## Security Considerations

1. **Environment Variables**: Never commit `.env` to git
2. **Token File**: Never commit `token.json` to git
3. **HTTPS in Production**: OAuth requires secure connections
4. **Minimal Scopes**: Only request necessary API permissions
5. **Input Validation**: Always validate user input
6. **Rate Limiting**: Implement on production servers
7. **CORS**: Configure CORS for production domains

---

## Troubleshooting

### "Not authenticated" after page refresh

The OAuth token is stored in `backend/token.json`. For development:
- Ensure token.json exists and is valid
- Run authentication flow again if corrupted

### Images not uploading

- Verify Google Drive API is enabled
- Check file size (max 5GB per file)
- Ensure sufficient Drive storage
- Verify MIME type is correct

### Sheets not updating

- Verify spreadsheet ID is correct
- Check user has edit permissions
- Ensure range is valid (e.g., "Sheet1!A:Z")
- Check for API quota errors

### CORS errors from frontend

- Ensure server is running on http://localhost:3001
- Check if API_BASE_URL in client matches server URL
- Verify CORS middleware is enabled

---

## Production Deployment

### Environment Setup

1. Use production OAuth credentials
2. Set `NODE_ENV=production`
3. Update `GOOGLE_REDIRECT_URI` to your domain
4. Use environment management (pm2, systemd, etc.)

### Server Configuration

```bash
# Using PM2
npm install -g pm2
pm2 start backend/server.js --name "sheets-api"
pm2 save
pm2 startup

# Using Docker
docker run -e GOOGLE_CLIENT_ID=xxx -e GOOGLE_CLIENT_SECRET=xxx -p 3001:3001 myapp
```

### Security

- Use HTTPS/TLS
- Implement rate limiting
- Add request logging
- Monitor API quota usage
- Regularly rotate credentials

---

## License

MIT

## Support

For issues and questions, check the [SETUP.md](./SETUP.md) guide or see inline code documentation.
