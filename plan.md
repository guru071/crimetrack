# Google Sheets Sync Integration Plan

## Task Overview
Enhance the React frontend (App.jsx) with complete Google Sheets sync features including authentication, data synchronization, and UI components.

## Implementation Strategy

### 1. New Components to Create
- **GoogleSheetsSync.jsx**: Modal dialog for OAuth authentication and sync configuration
  - Authentication flow with Google OAuth
  - Options: Append or Replace data
  - Sync progress indicator
  - Success/error messages
  - Secure token storage
  
- **GoogleSheetsView.jsx**: Tab displaying data from Google Sheets
  - Tabular display of synced data
  - Pull-to-refresh functionality
  - Select/import specific records
  - "Import Selected" button
  - Sync status and last update time

### 2. Component Modifications

**App.jsx (Main)**:
- Add Google Sheets state: `googleSheetsAuth`, `sheetsData`, `lastSyncTime`, `isSyncing`
- Add OAuth callback handler (redirect URI: `window.location.origin + '/auth-callback'`)
- Add API methods for Google Sheets sync
- Update renderView() to include GoogleSheetsView

**Dashboard.jsx**:
- Add "Sync to Google Sheets" button section
- Show sync status (connected/disconnected)
- Display last sync timestamp
- Quick sync button

**SettingsView.jsx**:
- Add "Google Sheets Settings" section
- Google Sheet ID input field
- "Authenticate with Google" button
- "Disconnect" button
- Display authenticated email

**BottomNav.jsx**:
- Add "Google Sheets" tab (if authenticated)
- Use Cloud icon or Sheet icon
- Show notification badge if sync needed

### 3. Key Functionality
- OAuth 2.0 authentication flow
- Secure token storage in localStorage
- Backend API calls for sync operations
- Load states during sync
- Toast messages for success/error
- Pull-to-refresh on GoogleSheetsView
- Record preview before import
- Handle large datasets efficiently

### 4. Backend API Endpoints (to be called)
- POST `/api/sheets/auth` - Get OAuth URL
- POST `/api/sheets/callback` - Handle OAuth callback
- POST `/api/sheets/sync` - Sync records to Google Sheets
- GET `/api/sheets/data` - Fetch data from Google Sheets
- POST `/api/sheets/import` - Import selected records
- POST `/api/sheets/disconnect` - Revoke access

### 5. Files to Modify
1. src/App.jsx - Add state, methods, views
2. Create src/GoogleSheetsSync.jsx
3. Create src/GoogleSheetsView.jsx
4. Update SettingsView section in App.jsx
5. Update BottomNav section in App.jsx
6. Update Dashboard section in App.jsx

## Implementation Order
1. Create GoogleSheetsSync component
2. Create GoogleSheetsView component  
3. Update Dashboard with sync button
4. Update SettingsView with Google Sheets config
5. Update BottomNav with new tab
6. Add state and methods to App.jsx
7. Integrate all components
8. Test authentication flow
9. Test sync operations
