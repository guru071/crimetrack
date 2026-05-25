# CrimeTrack API Setup

Use this checklist before building APK or EXE.

## 1. Firebase Login And Police Profiles

Paste Firebase web app values in:

```text
C:\Users\gurup\police\crimetrack-app\.env
```

Required keys:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GOOGLE_DRIVE_FOLDER_ID=1KxrdQhObWEvPFQvzk4rZexFYabIKo77l
```

Firebase Console setup:

1. Authentication > Sign-in method: enable Email/Password.
2. Authentication > Sign-in method: enable Google if you want the Google login button.
3. Authentication > Settings > Authorized domains: add `localhost`.
4. Firestore Database: create the `case` database. CrimeTrack stores profiles in `users/{uid}` and stations in `stations/{station}`.
5. Firebase Storage is not required. Officer photos are compressed into the Firestore police profile to avoid the missing-bucket APK login crash.

## 2. Google Drive Police Profile Images

The current Drive folder is:

```env
VITE_GOOGLE_DRIVE_FOLDER_ID=1KxrdQhObWEvPFQvzk4rZexFYabIKo77l
```

Paste a different folder ID in `.env` only if you change folders.

For Drive upload through Google Apps Script:

1. Open your Google Sheet.
2. Extensions > Apps Script.
3. Paste all code from:

```text
C:\Users\gurup\police\crimetrack-app\scripts\CrimeTrackGoogleWebApp.gs
```

4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. In CrimeTrack app: Settings > Google Sheets > Apps Script Web App URL.

The script uploads profile images to the Drive folder ID above.

## 3. Custom Database

Paste your database API URL in:

```text
CrimeTrack app > Settings > Custom Database API URL
```

Example local URL:

```text
http://localhost:3000/api/records
```

If you use an API secret, paste the same value in:

```text
CrimeTrack app > Settings > API Secret Key
```

and in the backend environment variable expected by your backend.

## 4. Native Phone APIs

Already configured in Android:

```text
CAMERA
RECORD_AUDIO
POST_NOTIFICATIONS
USE_BIOMETRIC
android.speech.RecognitionService
```

These support camera, mic dictation, local notifications, biometric/PIN unlock, and speech recognition.

## 5. Check Everything

Run:

```powershell
npm run lint
npm run build
npm run check:api
```

If `check:api` says Firestore needs attention, create/enable the `case` database in Firebase Console first. That cannot be fixed from the source code alone.

## 6. Build Commands

APK:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK output:

```text
C:\Users\gurup\police\crimetrack-app\android\app\build\outputs\apk\debug\app-debug.apk
```

EXE:

```powershell
npm run build
npm run build:win
```

EXE output:

```text
C:\Users\gurup\police\crimetrack-app\release\crimetrack-app Setup 0.0.0.exe
```
