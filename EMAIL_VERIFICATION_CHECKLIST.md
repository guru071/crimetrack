# Email Verification - Quick Setup Checklist ✓

## 🚀 Quick Start (5 minutes)

### Step 1: Firebase Console - Email Templates
1. Go to https://console.firebase.google.com
2. Select project: **case-3791e**
3. **Authentication** → **Templates** tab
4. Click **Email verification** → **pencil icon**
5. ✅ **Enable** (toggle at top)
6. Edit:
   - **Subject:** `Verify your CrimeTrack Police Account`
   - **Reply-to:** Leave default
   - Keep the HTML template
7. Click **Save**

### Step 2: Add Authorized Domains
1. **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add for **development:**
   - `localhost`
   - `127.0.0.1`
5. Add for **production:**
   - Your actual domain (e.g., `crimetrack.com`)

### Step 3: Test Locally
1. Run your app: `npm run dev`
2. Open: http://localhost:5173 (or your dev port)
3. Sign up with email: `test@gmail.com`
4. **Expected:** Verification screen appears
5. Check Gmail spam folder for verification email
6. Click link in email
7. Return to app and click "I've verified my email"
8. ✅ Should show success!

---

## 🔧 What Was Updated

### Firebase Module (`src/firebase.js`)
✅ Added `applyActionCode` for handling verification links

### Login Component (`src/LoginView.jsx`)
✅ Added URL parameter detection for email verification links
✅ Added `applyActionCode()` callback handler
✅ Better error messages for verification

---

## 📧 Gmail Testing

### Quick Test
1. Use your personal Gmail account
2. Sign up with that email
3. Check inbox/spam for verification email

### Troubleshooting
- ❌ **No email?** Check **Spam** folder
- ❌ **Still nothing?** Check Firebase Console > Authentication > Email delivery status
- ✅ **Got it?** Click link → return to app → click "I've verified my email"

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| No email arrives | Check spam folder, verify template is enabled |
| Link doesn't work | Must click within 24 hours, domain must be authorized |
| "Invalid code" error | Link expired, click "Resend verification email" |
| Rate limiting | Wait 30 sec between resend attempts |

---

## 📋 Complete Flow

1. User signs up with email
2. App shows "Verify your email"
3. Firebase sends email with link
4. User clicks link in email → redirects to app
5. App detects URL parameters and verifies
6. User sees "Email verified!" message
7. User can log in and use app

---

## ✨ Next: Production Setup

When deploying to production (after basic testing works):

1. **Configure SMTP** (if sending >500 emails/day):
   - Authentication > Settings > SMTP settings
   - Use SendGrid, Mailgun, or custom email provider

2. **Custom domain**:
   - Use your actual domain in authorized domains
   - Firebase will show verification in email

3. **Monitor**:
   - Authentication > Email delivery logs
   - Check bounce rates and delivery status

---

## 📞 Still Not Working?

1. ✅ Open Firebase Console
2. ✅ Go to Authentication > Email delivery
3. ✅ Check for error logs
4. ✅ Look at browser console (F12) for errors
5. ✅ Check app's verify screen for error message

**Most common:** Email template not enabled. Go back to Step 1 and make sure template is **ENABLED**.
