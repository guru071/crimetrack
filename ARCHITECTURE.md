# 🏗️ Google Sheets Backend - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Components                                         │  │
│  │  - GoogleSheetsExample.jsx                               │  │
│  │  - Your own components                                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  GoogleSheetsClient (google-sheets-client.js)           │  │
│  │  - Fetch API wrapper                                     │  │
│  │  - Base64 conversion utilities                           │  │
│  │  - API methods for Sheets/Drive                          │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ HTTP/REST
                        │
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                        │
│  Port: 3001                                                     │
│  File: backend/server.js                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express Server with 10 API Endpoints                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Auth Endpoints (/auth/url, /auth/callback, etc)   │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │  Sheets Endpoints (/sync, /fetch, /import, etc)    │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │  Drive Endpoints (/upload-image, /delete-image)    │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │  Utility Endpoints (/health, /info)                │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ▲                              ▲                        │
│         │                              │                        │
│  ┌──────┴──────────┐      ┌────────────┴──────────┐            │
│  │                 │      │                       │            │
│  ▼                 ▼      ▼                       ▼            │
│ GoogleSheets      CORS   Error     Middleware   Logging       │
│ Handler          Config  Handlers   Stack      (Console)      │
│ (Handler Logic)                                              │
│  file: google-sheets-handler.js                              │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ OAuth 2.0                         │ OAuth 2.0
         │                                    │
┌─────────┴────────────────────────────────────┴─────────┐
│              Google APIs (via googleapis)                │
│  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │  Sheets API v4       │  │  Drive API v3           │  │
│  │  - Read/Write        │  │  - Upload/Delete files  │  │
│  │  - Append rows       │  │  - Manage permissions   │  │
│  │  - Update cells      │  │  - Get file info        │  │
│  └──────────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                                    │
    ┌────┴────────────────────────────────────┴─────┐
    │                                               │
    ▼                                               ▼
┌──────────────────┐                    ┌─────────────────────┐
│  Google Sheets   │                    │   Google Drive      │
│  Spreadsheets    │                    │   File Storage      │
│  - Data rows     │                    │   - Images          │
│  - Columns       │                    │   - Documents       │
└──────────────────┘                    └─────────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: OAuth Authentication

```
User Browser          Backend Server         Google Auth
    │                      │                      │
    ├─ Click Login ────────→│                      │
    │                       ├─ Get OAuth URL ────→│
    │                       │←───────── URL ──────│
    │                       │                      │
    │←──────── OAuth URL ───│                      │
    │                       │                      │
    ├─ Open URL ─────────────────────────────────→│
    │                       │   User Authorizes   │
    │                       │←─────────────────────
    │←─────────────────────────── Redirect + Code ─
    │                       │                      │
    ├─ Send Code ──────────→│                      │
    │                       ├─ Exchange Code ────→│
    │                       │←─ Access Token ─────│
    │                       │                      │
    │                       ✓ Save token.json
    │                       │
    │←─ Success ────────────│
    │
    ✓ Authenticated
```

### Flow 2: Data Sync

```
React App              Backend               Google Sheets
    │                      │                      │
    ├─ syncToSheet() ─────→│                      │
    │  - records array     │                      │
    │                      ├─ append() ──────────→│
    │                      │                      ├─ Add rows
    │                      │←─ updatedRows ───────│
    │                      │                      │
    │←─ {success, count} ──│
    │
    ✓ Data synced
```

### Flow 3: Image Upload

```
React App              Backend               Google Drive
    │                      │                      │
    ├─ uploadImage() ─────→│                      │
    │  - base64 data       │                      │
    │  - filename          ├─ create() ─────────→│
    │                      │                      ├─ Upload file
    │                      │←─ File ID ──────────│
    │                      │                      │
    │                      ├─ permissions() ────→│
    │                      │  - Make public      │
    │                      │←─ Permissions set ──│
    │                      │                      │
    │←─ {shareableLink} ───│
    │
    ✓ Image uploaded & shareable
```

---

## Component Interaction

```
┌─ google-sheets-handler.js (Core Logic)
│  ├─ initializeOAuth2Client()
│  ├─ handleCallback()
│  ├─ setCredentials()
│  ├─ appendToSheet()
│  ├─ readFromSheet()
│  ├─ updateSheet()
│  ├─ uploadImageToDrive()
│  ├─ deleteFileFromDrive()
│  ├─ syncToSheet()
│  ├─ importFromSheet()
│  ├─ twoWaySync()
│  ├─ getSpreadsheetInfo()
│  └─ handleApiError()
│
├─ server.js (Express Server)
│  ├─ Endpoint Handlers
│  │  ├─ /auth/url
│  │  ├─ /auth/callback
│  │  ├─ /auth/status
│  │  ├─ /sync
│  │  ├─ /fetch
│  │  ├─ /import
│  │  ├─ /two-way-sync
│  │  ├─ /upload-image
│  │  ├─ /delete-image
│  │  ├─ /info
│  │  └─ /health
│  │
│  └─ Middleware
│     ├─ express.json()
│     ├─ express.urlencoded()
│     ├─ cors()
│     └─ Error handlers
│
├─ google-sheets-client.js (Frontend Client)
│  ├─ request() - Base HTTP method
│  ├─ getAuthorizationUrl()
│  ├─ handleAuthCallback()
│  ├─ isAuthenticated()
│  ├─ syncToSheet()
│  ├─ fetchFromSheet()
│  ├─ importFromSheet()
│  ├─ twoWaySync()
│  ├─ uploadImage()
│  ├─ deleteImage()
│  ├─ getSpreadsheetInfo()
│  ├─ healthCheck()
│  ├─ fileToBase64()
│  ├─ canvasToBase64()
│  └─ formatRecordsForSheets()
│
└─ Configuration
   ├─ .env (secrets)
   ├─ token.json (OAuth tokens - auto-generated)
   └─ package.json (dependencies)
```

---

## API Endpoint Flow

```
HTTP Request from React
       │
       ├─ cors() middleware
       │
       ├─ express.json() parser
       │
       ├─ Route handler
       │  └─ Initialize GoogleSheetsHandler
       │     └─ Ensure authenticated
       │        └─ Call appropriate method
       │
       ├─ Response generation
       │
       └─ Error handler (if error)
              │
              └─ handleApiError()
                 └─ Return error JSON

HTTP Response to React
```

---

## Token Lifecycle

```
Start
  │
  ├─ No token.json
  │  └─ User not authenticated
  │     └─ Frontend calls GET /auth/url
  │        └─ User authorizes in browser
  │           └─ Backend receives code
  │              └─ Exchange code for tokens
  │                 └─ Save to token.json
  │                    └─ Authenticated ✓
  │
  ├─ token.json exists
  │  └─ Check expiry
  │     ├─ NOT expired
  │     │  └─ Use token as-is
  │     │
  │     └─ EXPIRED
  │        └─ Refresh token
  │           └─ Update token.json
  │              └─ Use new token
  │
  └─ Token invalid
     └─ Clear token.json
        └─ Redirect to auth flow
```

---

## Request/Response Examples

### GET /api/sheets/fetch Request

```
Request:
  GET /api/sheets/fetch?spreadsheetId=ABC123&range=Sheet1!A:Z
  Host: http://localhost:3001
  
Processing:
  1. Extract query params
  2. Validate params
  3. Ensure authenticated
  4. Call handler.readFromSheet()
  5. Parse response data
  6. Format as JSON

Response:
  {
    "success": true,
    "headers": ["Name", "Status", "Date"],
    "data": [
      {"Name": "John", "Status": "Active", "Date": "2024-01-15"},
      {"Name": "Jane", "Status": "Pending", "Date": "2024-01-14"}
    ],
    "rowCount": 2
  }
```

### POST /api/sheets/sync Request

```
Request:
  POST /api/sheets/sync
  Host: http://localhost:3001
  Content-Type: application/json
  
  {
    "spreadsheetId": "ABC123",
    "range": "Sheet1!A:Z",
    "records": [
      {"Name": "New Record", "Status": "Draft"}
    ]
  }

Processing:
  1. Parse JSON body
  2. Validate required fields
  3. Ensure authenticated
  4. Call handler.syncToSheet()
  5. Append rows to sheet

Response:
  {
    "success": true,
    "updatedRows": 1,
    "updatedCells": 2
  }
```

---

## Error Handling Flow

```
API Request
  │
  ├─ Try Operation
  │  └─ Success
  │     └─ Return 200 + Data
  │
  └─ Catch Error
     │
     ├─ handleApiError()
     │  │
     │  ├─ HTTP 403 (Permission)
     │  │  ├─ Check if "Quota"
     │  │  │  └─ Return 429 (Rate Limited)
     │  │  └─ Return 403 (Permission Denied)
     │  │
     │  ├─ HTTP 401 (Auth)
     │  │  └─ Return 401 (Unauthorized)
     │  │
     │  ├─ HTTP 404 (Not Found)
     │  │  └─ Return 404 (Not Found)
     │  │
     │  └─ HTTP 429 (Rate Limited)
     │     └─ Return 429 (Rate Limited)
     │
     └─ Return Error Response
        {
          "success": false,
          "error": "Descriptive error message"
        }
```

---

## Environment & Dependencies

```
Runtime: Node.js (v14+)
  │
  ├─ express (Web server)
  ├─ googleapis (Google APIs client)
  ├─ cors (CORS middleware)
  └─ dotenv (Environment variables)
  
Configuration:
  ├─ .env (OAuth credentials)
  ├─ package.json (dependencies)
  └─ backend/token.json (OAuth tokens)

External APIs:
  ├─ Google OAuth 2.0
  ├─ Google Sheets API v4
  └─ Google Drive API v3
```

---

## Security Architecture

```
Frontend
  │
  ├─ No hardcoded secrets
  ├─ CORS validation
  └─ Base64 image encoding
  
  │
  ├─ HTTP Layer
  │  └─ CORS headers
  │
  Backend
  │
  ├─ Input Validation
  │  └─ Validate all parameters
  │
  ├─ Authentication
  │  ├─ OAuth 2.0 flow
  │  └─ Token refresh
  │
  ├─ Secrets Management
  │  ├─ .env (not in git)
  │  ├─ token.json (not in git)
  │  └─ googleapis client secret
  │
  ├─ Error Handling
  │  └─ Safe error messages (no internals)
  │
  └─ Rate Limiting Ready
     └─ Can add middleware
  
  │
  ├─ HTTPS (production)
  └─ API Quotas
  
  │
  Google APIs
  │
  ├─ OAuth 2.0 verification
  ├─ Scope-based permissions
  └─ Rate limiting
```

---

## Deployment Architecture

```
Development:
  ├─ Frontend: http://localhost:3000 (Vite)
  ├─ Backend: http://localhost:3001 (Node.js)
  └─ Google OAuth: http://localhost:3001/api/sheets/auth/callback

Production:
  ├─ Frontend: https://yourdomain.com
  ├─ Backend: https://api.yourdomain.com
  ├─ Google OAuth: https://api.yourdomain.com/api/sheets/auth/callback
  └─ SSL/TLS: Required for OAuth
```

---

## File Size Reference

```
Core Backend:
  ├─ server.js                    11 KB  (Express server)
  ├─ google-sheets-handler.js     12 KB  (Core logic)
  ├─ google-sheets-client.js       5 KB  (Frontend client)
  └─ test.js                       4 KB  (Tests)

Documentation:
  ├─ README.md                    12 KB
  ├─ SETUP.md                      6 KB
  ├─ SHEETS_QUICKSTART.md          5 KB
  └─ Other guides                 ~30 KB

Total Backend Code:        ~32 KB
Total Documentation:       ~60 KB
npm Dependencies:          ~200 MB (node_modules)
```

---

## Performance Notes

```
Single Request:
  ├─ Frontend → Backend:        ~50ms
  ├─ Backend → Google OAuth:   ~100ms  (token refresh if needed)
  ├─ Backend → Sheets API:     ~200ms  (varies by operation)
  └─ Total per request:        ~350ms  (varies)

Batch Operations:
  ├─ Append 100 rows:          ~500ms
  ├─ Read 1000 rows:           ~800ms
  ├─ Upload image (2MB):      ~2000ms
  └─ Two-way sync:            ~1000ms

Caching:
  ├─ OAuth tokens:            Until expiry (1 hour typically)
  └─ No response caching       (Could be added)
```

---

## Scalability Considerations

```
Current (Development):
  ├─ Single server instance
  ├─ In-memory OAuth tokens
  ├─ Local token.json storage
  └─ No rate limiting

For Production:
  ├─ Multiple server instances
  ├─ Distributed token storage (Redis)
  ├─ Token storage in secure DB
  ├─ Rate limiting middleware
  ├─ Request logging
  ├─ Monitoring & alerts
  ├─ Load balancing
  └─ HTTPS/TLS
```

---

This architecture overview shows how all components interact to provide a complete Google Sheets API backend solution.
