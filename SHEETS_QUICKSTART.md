# Google Sheets Backend - Quick Start

This guide helps you get the Google Sheets API backend running.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Desktop Application**
6. Download and save your **Client ID** and **Client Secret**

### Step 2: Configure Environment

1. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/sheets/auth/callback
   GOOGLE_SHEETS_ID=your_spreadsheet_id_here
   ```

3. Update Google Cloud Console:
   - Go to OAuth 2.0 Client ID settings
   - Add Authorized Redirect URI: `http://localhost:3001/api/sheets/auth/callback`

### Step 3: Install & Run

```bash
# Install dependencies (run once)
npm install

# Start the backend server
npm run backend
```

You should see:
```
============================================================
🚀 Google Sheets API Server Running on Port 3001
============================================================
```

## 📋 API Usage Examples

### Example 1: Authenticate

```bash
# 1. Get auth URL
curl http://localhost:3001/api/sheets/auth/url

# 2. Open the returned URL in browser and authorize
# 3. After redirect, authentication is complete!
```

### Example 2: Check Auth Status

```bash
curl http://localhost:3001/api/sheets/auth/status
```

Response:
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authenticated"
}
```

### Example 3: Push Data to Sheets

```bash
curl -X POST http://localhost:3001/api/sheets/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "1a2b3c4d5e6f7g8h",
    "range": "Sheet1!A:Z",
    "records": [
      {"Name": "John Doe", "Status": "Active", "Date": "2024-01-15"},
      {"Name": "Jane Smith", "Status": "Pending", "Date": "2024-01-14"}
    ]
  }'
```

### Example 4: Pull Data from Sheets

```bash
curl "http://localhost:3001/api/sheets/fetch?spreadsheetId=1a2b3c4d5e6f7g8h&range=Sheet1!A:Z"
```

### Example 5: Upload Image

```bash
curl -X POST http://localhost:3001/api/sheets/upload-image \
  -H "Content-Type: application/json" \
  -d '{
    "base64Data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "fileName": "evidence-photo.jpg",
    "mimeType": "image/jpeg"
  }'
```

## 📖 Full Documentation

See [backend/README.md](./backend/README.md) for:
- Complete API reference
- Frontend integration examples
- Error handling
- Production deployment

See [backend/SETUP.md](./backend/SETUP.md) for:
- Detailed setup instructions
- Troubleshooting guide
- OAuth flow explanation

## 🔐 Credentials

**Never commit to git:**
- `.env` file (contains secrets)
- `backend/token.json` (contains OAuth tokens)

These are already in `.gitignore`

## 🎯 Common Tasks

### Getting Your Spreadsheet ID

1. Open your Google Sheet
2. Copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit#gid=0
   ```

### Using the Frontend Client

```javascript
import GoogleSheetsClient from './backend/google-sheets-client.js';

const client = new GoogleSheetsClient();

// Fetch data
const data = await client.fetchFromSheet('spreadsheet-id', 'Sheet1!A:Z');
console.log(data.data);

// Push data
await client.syncToSheet('spreadsheet-id', 'Sheet1!A:Z', [
  { Name: "John", Status: "Active" },
  { Name: "Jane", Status: "Pending" }
]);

// Upload image
const file = document.querySelector('input[type="file"]').files[0];
const result = await client.uploadImage(file, file.name);
console.log(result.shareableLink);
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Run the OAuth flow: Get URL → Authorize → Done |
| CORS errors | Ensure server is running on http://localhost:3001 |
| Spreadsheet not found | Check `GOOGLE_SHEETS_ID` in `.env` |
| Quota exceeded | Wait a few minutes and retry |

## 📞 Need Help?

1. Check [backend/SETUP.md](./backend/SETUP.md) for detailed guide
2. Review [backend/README.md](./backend/README.md) for API docs
3. Check inline code comments for implementation details

## ✅ Next Steps

1. ✓ Set up OAuth credentials
2. ✓ Configure `.env` file
3. ✓ Run `npm install` && `npm run backend`
4. ✓ Get auth URL and authorize
5. ✓ Test API endpoints
6. ✓ Integrate with frontend

Happy coding! 🎉
