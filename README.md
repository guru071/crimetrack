# C.A.S.E — Criminal Activity Surveillance Engine
**Developed by GOAT'ECH**

A cross-platform law enforcement records management system — **Android APK**, **Windows EXE**, and **Web App** — built with React + Capacitor + Electron.

---

## 🚀 Quick Start (Development)
```bash
npm install
npm run dev          # Web dev server
npm run build:win    # Build Windows EXE installer
```
For Android APK:
```bash
npm run build
npx cap sync android
cd android && gradlew assembleRelease
```

---

## 📂 Key File Locations for Your Friend

### Notification System (`src/App.jsx`)
- **`broadcastNotification()`** (line ~3019) — Writes a `TEAM_NOTIFICATION` audit log entry to the shared Google Sheet or Database API when a record is added/updated/deleted.
- **Background polling loop** (line ~2887) — Every 30-60s, polls the shared source for new audit logs. When it finds a `TEAM_NOTIFICATION` log event, it:
  1. Fires a **real Android/iOS push notification** via `@capacitor/local-notifications`
  2. Stores it **locally** in `localStorage` (`crimetrack_notifications`) — NOT in Firebase
  3. Shows an in-app floating banner for 5 seconds
- **`triggerPushNotification()`** (line ~2998) — Schedules a native `LocalNotifications` push on Android/iOS.
- **`addNotification()`** (line ~2853) — Stores notification in localStorage + shows web Notification API.

### What Your Friend Needs to Fix/Build
1. **FCM (Firebase Cloud Messaging) for true background push** — Currently uses `@capacitor/local-notifications` which only fires when the app is open. For true background notifications (when app is closed), integrate FCM:
   - Add `@capacitor-firebase/messaging` plugin
   - Set up FCM in Firebase Console
   - Send FCM message from the `broadcastNotification()` function via a Cloud Function or backend

2. **Operations Room messages** (`src/OperationsRoom.jsx`) — P2P messages via PeerJS are NOT stored in Firebase. They are ephemeral (live only while connected). If persistence is needed, save messages to the shared Google Sheet or Database via `sendAuditLog()`.

3. **Notification seen/delete logic** — Add a `seenBy` array to notification log entries in the shared source, and delete from source when all officers have seen it.

### Authentication (`src/LoginView.jsx`)
- Google Sign-In on web/Electron uses Firebase popup
- Google Sign-In on Android uses native plugin (`@capacitor-firebase/authentication`)

### Data Sources (`src/dataSources.js`)
- `local` — localStorage only
- `google` — Google Sheets via Apps Script Web App URL
- `database` — Custom REST API (your backend)

### Windows EXE (`electron/main.cjs`)
- Google Auth popup fix: popup window uses `contextIsolation: false` to allow Firebase to send token back
- User-Agent patched to remove "Electron" so Google accepts OAuth

### NSIS Installer (`build/installer.nsh`, `build/license.txt`)
- Custom uninstaller asks whether to delete local app data (`%APPDATA%\case`)
- License agreement shown during install

---

## 🔔 Notification Architecture (Current)

```
Officer A adds record
        ↓
broadcastNotification() 
        ↓
sendAuditLog() → writes TEAM_NOTIFICATION to Google Sheet / DB
        ↓
Other officers' apps poll every 30s
        ↓  
Detect new TEAM_NOTIFICATION log
        ↓
triggerPushNotification() → Android/iOS notification bar
addNotification() → stored in localStorage (NOT Firebase)
```

**Firebase is used ONLY for:**
- Authentication (login/signup)
- Officer profile storage (`users` collection)
- Station list (`stations` collection)

**Firebase is NOT used for:**
- Notifications (moved to shared audit log)
- Records (stored in Google Sheet or DB or localStorage)
- Operations Room messages (P2P via PeerJS)

---

## 📱 Build Commands
| Platform | Command | Output |
|----------|---------|--------|
| Web | `npm run dev` | `localhost:5173` |
| Windows EXE | `npm run build && npm run build:win` | `release/C.A.S.E Setup 1.0.0.exe` |
| Android APK | `npm run build && npx cap sync android && cd android && gradlew assembleRelease` | `android/app/build/outputs/apk/release/app-release-unsigned.apk` |
