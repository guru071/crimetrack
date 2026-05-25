# C.A.S.E Complete Setup Guide

**Status**: Bugs fixed ✓ | Dependencies added ✓ | Ready for configuration & testing

---

## Phase 1: Install Dependencies ⏳ PENDING

### Step 1: Install npm packages

```bash
npm install
```

This will install:
- `@emailjs/browser` - For sending verification emails from your Gmail
- `@capacitor-community/google-signin` - For native Google Sign-In on Android APK

**Why**: These were missing from package.json and causing import errors in LoginView and App.jsx

---

## Phase 2: Configure EmailJS (Email Verification) ⏳ PENDING

### Step 1: Create EmailJS Account (2 minutes)

1. Go to https://www.emailjs.com
2. Click **Sign Up** (free tier is fine)
3. Create account with your email

### Step 2: Connect Gmail Account (3 minutes)

1. In EmailJS Dashboard, click **Email Services** 
2. Click **Add New Service**
3. Select **Gmail**
4. Click **Connect Account**
5. Sign in with your Gmail account
6. Authorize EmailJS
7. Save Service ID (usually `gmail_service` - copy this!)

### Step 3: Create Email Template (5 minutes)

1. Go to **Email Templates**
2. Click **Create New Template**
3. Template Name: `email_verification`
4. Fill in the template:

```
Subject: C.A.S.E - Email Verification

Hello {{user_name}},

Please verify your email address by clicking the link below:

{{verification_link}}

This link expires in 24 hours.

Best regards,
C.A.S.E System
```

5. Save Template

### Step 4: Get Public Key (1 minute)

1. Go to **Account** in top menu
2. Copy your **Public Key**
3. Add to `src/emailService.js`:

```javascript
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE'; // Paste here
const SERVICE_ID = 'gmail_service'; // From step 2
const TEMPLATE_ID = 'email_verification'; // From step 3
```

**Total Time**: ~15 minutes

---

## Phase 3: Configure Native Google Sign-In for APK ⏳ PENDING

### Step 1: Get Web Client ID (5 minutes)

1. Go to https://console.cloud.google.com
2. Select your Firebase Project
3. Go to **APIs & Services** > **Credentials**
4. Find **Web Client** credential
5. Copy the **Client ID** (ends with `.apps.googleusercontent.com`)

### Step 2: Get App SHA-1 Fingerprint (2 minutes)

Run this command:

```bash
npm run get-sha1
```

This will print your SHA-1 fingerprint. Copy it!

### Step 3: Add Fingerprint to Firebase (3 minutes)

1. Go to Firebase Console > Project Settings > Your apps
2. Select your Android app (com.police.case)
3. Scroll down to **SHA certificate fingerprints**
4. Click **Add fingerprint**
5. Paste the SHA-1 you copied above
6. Save

### Step 4: Configure in App (1 minute)

Update `src/nativeGoogleSignIn.js`:

```javascript
const clientId = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'; // Paste Web Client ID here
```

**Total Time**: ~15 minutes

---

## Phase 4: Test Web Locally ⏳ PENDING

### Start Dev Server

```bash
npm run dev
```

Server runs at: **http://localhost:5174**

### Test Cases:

✓ **Email/Password Sign-Up**
- Click "Sign Up" tab
- Fill name, email, password, station
- Submit → Should ask to verify email

✓ **Google Sign-In (Web Popup)**
- Click "Sign in with Google"
- Google popup appears
- Select account → Should sign in

✓ **Email Verification**
- After signup, check your email
- Click verification link
- Should say "Email verified successfully"

✓ **Firebase Email Verification (Fallback)**
- If EmailJS not configured, click "Check Verification Status"
- Should eventually verify

---

## Phase 5: Build & Test APK ⏳ PENDING

### Prerequisites

- Android Studio or Android SDK tools installed
- `android` command available in PATH
- `gradlew` in project (already configured)

### Build APK

```bash
# Build debug APK (fastest, for testing)
npx cap build android

# Or build release APK (for Google Play)
npx cap build android -- --prod
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Test on Device

```bash
# Install on connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Or use Android Studio to run on emulator
```

### Test Native Google Sign-In

✓ Open APK
✓ Click "Sign in with Google"
✓ **Native Android Google picker appears** (like Gmail, Maps, YouTube)
✓ Select account
✓ Signs in automatically

---

## Phase 6: Deploy Web ⏳ PENDING

### Option A: Firebase Hosting (Recommended)

```bash
# Initialize Firebase Hosting
firebase init hosting

# Build production bundle
npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be at: `https://your-project.web.app`

### Option B: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option C: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

---

## Quick Checklist

### Before Testing:
- [ ] `npm install` completed
- [ ] EmailJS Public Key added to `src/emailService.js`
- [ ] Gmail service ID is `gmail_service`
- [ ] Email template ID is `email_verification`
- [ ] Google Web Client ID added to `src/nativeGoogleSignIn.js`
- [ ] App SHA-1 added to Firebase Console

### Testing:
- [ ] Web server starts at port 5174
- [ ] Email/password signup works
- [ ] Google popup works on web
- [ ] Email verification email received
- [ ] Verification link works
- [ ] APK builds without errors
- [ ] Native Google picker shows on APK

### Deployment:
- [ ] Production build succeeds: `npm run build`
- [ ] Web hosting configured and working
- [ ] APK signed and ready for Google Play (if releasing)

---

## Troubleshooting

### "EmailJS not configured" warning
**Fix**: Add your Public Key to `src/emailService.js` line 8

### "Native Google Sign-In not initialized" on APK
**Fix**: Add Web Client ID to `src/nativeGoogleSignIn.js` line 31

### Google popup blocked on web
**Fix**: Popups are allowed by default. If blocked:
- Check browser settings
- Disable popup blockers
- Use `signInWithPopup` (already configured)

### Email verification link expired
**Fix**: Links expire in 24 hours. User can click "Resend Verification Email"

### APK crashes on Google Sign-In
**Fix**: Verify:
- SHA-1 fingerprint is correct and added to Firebase
- Web Client ID is correct
- Google Play Services installed on device

---

## File Changes Summary

**Modified Files**:
- `package.json` - Added @emailjs/browser and @capacitor-community/google-signin
- `src/App.jsx` - Added initialization imports and useEffect for EmailJS and Native Google
- `src/firebase.js` - Already configured with signInWithPopup
- `src/LoginView.jsx` - Already has Google Sign-In logic and email verification handling

**New Files**:
- `src/emailService.js` - EmailJS integration (needs credentials)
- `src/nativeGoogleSignIn.js` - Native Google Sign-In for APK (needs Client ID)

---

## Next Steps

1. **Install dependencies**: `npm install`
2. **Configure EmailJS**: Get Public Key, add to `src/emailService.js`
3. **Configure Native Google**: Get Web Client ID, add to `src/nativeGoogleSignIn.js`
4. **Test web**: `npm run dev` and test all flows
5. **Build APK**: `npx cap build android`
6. **Test APK**: Install on device and verify Google Sign-In
7. **Deploy**: `npm run build` then deploy to hosting

**Estimated Total Time**: 1-2 hours for full setup + testing

---

**Questions?** Check Firebase Console > Authentication > Settings for more details.
