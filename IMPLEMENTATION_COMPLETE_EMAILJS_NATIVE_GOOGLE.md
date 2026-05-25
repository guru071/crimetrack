# EmailJS + Native Google Sign-In Setup - Complete Implementation

## ✅ What Was Implemented

### 1. EmailJS Gmail Verification (`src/emailService.js`)
- Send verification emails from your Gmail
- Fallback to Firebase if EmailJS not configured
- Professional email templates

### 2. Native Google Sign-In for APK (`src/nativeGoogleSignIn.js`)
- Works like Gmail, Google Maps, Uber
- Native Android Google picker
- No "missing initial state" error
- Professional app experience

### 3. Updated LoginView (`src/LoginView.jsx`)
- Uses EmailJS first, Firebase fallback
- Native Google Sign-In on APK
- Web popup on browser

---

## 🚀 Setup Instructions

### Part 1: EmailJS Setup (15 minutes)

#### Step 1: Enable Gmail App Password
```
1. Go to: https://myaccount.google.com
2. Security → 2-Step Verification (enable if needed)
3. Go to: https://myaccount.google.com/security/apppasswords
4. Select: Mail + Windows Computer
5. Copy the 16-character password
```

#### Step 2: Create EmailJS Account
```
1. Go to: https://www.emailjs.com
2. Sign up free with Gmail
3. Dashboard → Email Services
4. Create Gmail service → Connect Gmail with app password
```

#### Step 3: Create Email Template
```
1. Dashboard → Email Templates
2. Create new template named: email_verification
3. Use this content:

HTML Template:
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }
    .button { background: #1e3a8a; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email</h2>
    <p>Hello {{user_name}},</p>
    <p>Click the button below to verify your email for C.A.S.E:</p>
    <div style="text-align: center;">
      <a href="{{verification_link}}" class="button">Verify Email</a>
    </div>
    <p>Or copy this link:</p>
    <p>{{verification_link}}</p>
    <p>Link expires in 24 hours.</p>
  </div>
</body>
</html>
```

#### Step 4: Get Your Credentials
```
1. Account (top right) → Copy Public Key
2. Email Services → Copy Service ID
3. Email Templates → Copy Template ID
```

#### Step 5: Update emailService.js
```javascript
// In src/emailService.js, line 8-10:
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Paste your Public Key
const SERVICE_ID = 'gmail_service';
const TEMPLATE_ID = 'email_verification';
```

#### Step 6: Install Package
```bash
npm install @emailjs/browser
```

---

### Part 2: Native Google Sign-In Setup (20 minutes)

#### Step 1: Get Your App's SHA-1 Fingerprint

**Windows:**
```bash
cd c:\Users\gurup\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the SHA1 value (remove colons):
```
SHA1: AB:CD:EF:12:34:56... → ABCDEF123456...
```

#### Step 2: Add SHA-1 to Firebase
```
1. Firebase Console → project case-3791e
2. Project Settings → Your apps → Android
3. SHA certificate fingerprints → Add fingerprint
4. Paste your SHA1 → Save
```

#### Step 3: Get Your Web Client ID
```
1. Go to: https://console.cloud.google.com
2. Select your project
3. APIs & Services → Credentials
4. Copy "Web client (auto created by Firebase)" → Client ID
```

#### Step 4: Update nativeGoogleSignIn.js
```javascript
// In src/nativeGoogleSignIn.js, line 26:
clientId: '351985375859-XXXXXXXXXX.apps.googleusercontent.com', // Your Web Client ID
```

#### Step 5: Install Plugin
```bash
npm install @capacitor-community/google-signin
npx cap sync android
```

#### Step 6: Update Android Gradle (Optional)
In `android/app/build.gradle`, ensure these are present:
```gradle
dependencies {
  implementation 'com.google.android.gms:play-services-auth:20.7.0'
  implementation 'com.google.firebase:firebase-auth:22.3.0'
}
```

---

## 🧪 Testing

### Test EmailJS (Web)
```bash
npm run dev
# Sign up with test email
# Check Gmail for verification email
# Click link to verify
```

### Test Native Google Sign-In (APK)
```bash
npm run build
npx cap sync android
# Build in Android Studio
# Install on phone
# Click "Continue with Google"
# Native picker appears → Select account → ✅
```

---

## ✅ Checklist

### EmailJS
- [ ] Enable Gmail App Password
- [ ] Create EmailJS account
- [ ] Connect Gmail to EmailJS
- [ ] Create email template
- [ ] Get Public Key, Service ID, Template ID
- [ ] Update emailService.js with credentials
- [ ] `npm install @emailjs/browser`
- [ ] Test locally

### Native Google Sign-In
- [ ] Get app SHA-1 fingerprint
- [ ] Add SHA-1 to Firebase Console
- [ ] Get Web Client ID from Google Cloud
- [ ] Update nativeGoogleSignIn.js with Client ID
- [ ] `npm install @capacitor-community/google-signin`
- [ ] `npx cap sync android`
- [ ] Build APK and test

---

## 🔧 Troubleshooting

### EmailJS Issues
| Problem | Solution |
|---------|----------|
| "EmailJS not configured" | Update PUBLIC_KEY in emailService.js |
| Emails not received | Check Gmail spam, verify app password is correct |
| 503 Service Unavailable | EmailJS service down, will retry |

### Native Google Sign-In Issues
| Problem | Solution |
|---------|----------|
| "Client ID not configured" | Update clientId in nativeGoogleSignIn.js |
| "Google Play Services not available" | Phone needs Google Play Services installed |
| "SHA-1 mismatch" | Make sure debug SHA-1 matches Firebase |

---

## 📊 File Structure

```
src/
├── LoginView.jsx (✓ Updated)
├── emailService.js (✓ New - EmailJS integration)
├── nativeGoogleSignIn.js (✓ New - Native Google Sign-In)
├── firebase.js (✓ Already configured)
└── App.jsx
```

---

## 🎯 What You Now Have

✅ **Professional Email Verification**
- Emails from YOUR Gmail account
- Beautiful HTML templates
- Reliable delivery

✅ **Professional APK Google Login**
- Native Android Google picker
- Works like Gmail, Maps, Uber
- No popups, no "missing initial state" error

✅ **Fallback Support**
- EmailJS if configured
- Firebase if not
- Both web and APK support

---

## 🚀 Next Steps

1. Complete the setup above
2. Test locally with `npm run dev`
3. Build APK with `npm run build && npx cap sync android`
4. Test on Android phone
5. Deploy! 🎉

Questions? Check the troubleshooting section or your browser console for error messages.
