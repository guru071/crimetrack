# Google Sheets API Backend - Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

### 1. Install Dependencies

From the project root directory, run:

```bash
npm install
```

This will install the following packages:
- **express** - Web server framework
- **cors** - Cross-Origin Resource Sharing middleware
- **dotenv** - Environment variable management
- **googleapis** - Google APIs client library

### 2. Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API
4. Go to "Credentials" and create an OAuth 2.0 Desktop Application
5. Download the credentials JSON file
6. Copy the following values:
   - `client_id`
   - `client_secret`

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in the following:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/sheets/auth/callback
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
PORT=3001
```

### 4. Update Google Cloud Redirect URI

In Google Cloud Console:
1. Go to APIs & Services > Credentials
2. Click on your OAuth 2.0 Desktop Application
3. Add Authorized redirect URIs:
   - `http://localhost:3001/api/sheets/auth/callback`
4. Save

## Running the Server

From the project root directory:

```bash
npm install
node backend/server.js
```

The server will start on `http://localhost:3001`

You should see output like:

```
============================================================
🚀 Google Sheets API Server Running on Port 3001
============================================================

📋 Available Endpoints:
  Auth:
    GET  /api/sheets/auth/url
    POST /api/sheets/auth/callback
    GET  /api/sheets/auth/status
  ...
```

## API Endpoints

### Authentication

- **GET `/api/sheets/auth/url`** - Get OAuth authorization URL
- **POST `/api/sheets/auth/callback`** - OAuth callback handler
- **GET `/api/sheets/auth/status`** - Check authentication status

### Sheets Operations

- **POST `/api/sheets/sync`** - Push records to Sheets
- **GET `/api/sheets/fetch`** - Pull data from Sheets
- **POST `/api/sheets/import`** - Import data from Sheets
- **POST `/api/sheets/two-way-sync`** - Two-way sync

### Drive Operations

- **POST `/api/sheets/upload-image`** - Upload image to Drive
- **POST `/api/sheets/delete-image`** - Delete image from Drive

### Utilities

- **GET `/api/sheets/info`** - Get spreadsheet metadata
- **GET `/api/health`** - Health check

## OAuth Flow

1. **Get Auth URL**: Call `GET /api/sheets/auth/url`
2. **User Consent**: Open the returned URL in browser and authorize
3. **Get Code**: Google redirects to your app with an auth code
4. **Exchange Code**: POST the code to `/api/sheets/auth/callback`
5. **Tokens Saved**: Credentials are saved to `backend/token.json`

## Usage Example

### 1. Get Authorization URL

```bash
curl http://localhost:3001/api/sheets/auth/url
```

Response:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 2. After User Authorization

```bash
curl -X POST http://localhost:3001/api/sheets/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"auth_code_here"}'
```

### 3. Sync Data to Sheets

```bash
curl -X POST http://localhost:3001/api/sheets/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "your_sheet_id",
    "range": "Sheet1!A:Z",
    "records": [
      {"Name": "John", "Age": "30", "Status": "Active"},
      {"Name": "Jane", "Age": "28", "Status": "Active"}
    ]
  }'
```

### 4. Fetch Data from Sheets

```bash
curl "http://localhost:3001/api/sheets/fetch?spreadsheetId=your_sheet_id&range=Sheet1!A:Z"
```

### 5. Upload Image to Drive

```bash
curl -X POST http://localhost:3001/api/sheets/upload-image \
  -H "Content-Type: application/json" \
  -d '{
    "base64Data": "iVBORw0KGgoAAAANS...",
    "fileName": "evidence-photo.jpg",
    "mimeType": "image/jpeg"
  }'
```

## Error Handling

The server handles common API errors:

- **403 Quota Exceeded**: Returns 429 status
- **401 Unauthorized**: Token may be invalid
- **404 Not Found**: Spreadsheet or file not found
- **429 Rate Limited**: Too many requests

## Debugging

Enable logging by checking the server output. All API calls are logged with timestamps.

Example error handling:

```json
{
  "success": false,
  "error": "API Quota Exceeded: This action exceeds quota..."
}
```

## Token Management

OAuth tokens are saved to `backend/token.json`:
- Tokens automatically refresh before expiry
- File is created after successful authentication
- Never commit this file to version control
- Keep it secure as it grants API access

## Troubleshooting

### "Not authenticated" Error

- Run the OAuth flow: Get auth URL → Authorize → Callback
- Ensure `token.json` exists in the backend directory

### API Quota Exceeded

- Check API usage in Google Cloud Console
- Wait before retrying
- Use exponential backoff for retries

### Permission Denied

- Verify scopes include Sheets and Drive APIs
- Check spreadsheet sharing permissions
- Re-authenticate with fresh consent

### Redirect URI Mismatch

- Ensure `GOOGLE_REDIRECT_URI` in `.env` matches Google Cloud config
- Both must be exactly `http://localhost:3001/api/sheets/auth/callback`

## Security Notes

1. **Never commit `.env` file** - It contains secrets
2. **Never commit `token.json`** - It contains OAuth tokens
3. **Use HTTPS in production** - OAuth requires secure connections
4. **Limit scope** - Only request necessary permissions
5. **Rotate credentials** - Regularly update OAuth tokens
6. **Rate limiting** - Implement on production servers

## Production Deployment

For production use:

1. Update `GOOGLE_REDIRECT_URI` to your domain
2. Update Google Cloud redirect URIs
3. Use environment variables for secrets
4. Implement rate limiting middleware
5. Add request logging and monitoring
6. Use HTTPS/TLS
7. Implement token refresh strategies
8. Add request validation and sanitization
