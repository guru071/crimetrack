# Quick Start - Next Steps

## ✅ Done: Bug Fixes & Code Setup
All bugs fixed, dependencies added, code ready!

---

## ⏳ Your Turn: Configuration (30 min)

### Step 1: Install Dependencies (2 min)
```bash
npm install
```

### Step 2: Get EmailJS Credentials (10 min)
1. Go to https://www.emailjs.com → Sign Up (free)
2. Add Gmail service
3. Create email template
4. Copy **Public Key** from Account settings
5. Add to `src/emailService.js` line 8:
```javascript
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';
```

### Step 3: Get Google Web Client ID (10 min)
1. Go to https://console.cloud.google.com
2. Select your Firebase Project
3. APIs & Services → Credentials
4. Copy **Web Client** ID
5. Add to `src/nativeGoogleSignIn.js` line 31:
```javascript
clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
```

### Step 4: Get SHA-1 Fingerprint (2 min)
```bash
npm run get-sha1
```
Copy the fingerprint and add to Firebase Console → Your Android App

### Step 5: Start Dev Server (1 min)
```bash
npm run dev
```
- Opens at http://localhost:5174
- Try Google Sign-In popup
- Try signup and check email

---

## ✨ Testing Checklist
- [ ] `npm install` worked
- [ ] Server starts at port 5174
- [ ] Google popup shows
- [ ] Email signup works
- [ ] Verification email received
- [ ] Link in email works

---

## 🚀 After Testing: Build & Deploy
```bash
# Build APK
npx cap build android

# Build web
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

**See COMPLETE_SETUP_GUIDE.md for detailed instructions!**
