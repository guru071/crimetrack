# Firebase Email Verification Setup Guide

## Problem
Verification emails are not being received. This is because Firebase needs to be configured with:
1. Email templates
2. Authorized domains
3. SMTP settings (for custom domain)

## Step 1: Enable Email Verification in Firebase Console

### 1.1 Go to Firebase Console
- Open: https://console.firebase.google.com
- Select your project: **case-3791e**

### 1.2 Navigate to Authentication
1. Click **Authentication** (left sidebar)
2. Click **Templates** tab (top menu)
3. Look for **Email verification** template

### 1.3 Configure Email Verification Template
1. Click on **Email verification** row
2. Click the **pencil icon** to edit
3. Customize the email:
   - **From name:** "CrimeTrack Police"
   - **From email:** `noreply@case-3791e.firebaseapp.com`
   - **Subject:** "Verify your CrimeTrack Police Account"
   - **Email body:** Copy and paste the template below:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { color: #1e3a8a; text-align: center; margin-bottom: 20px; }
    .button { background: #1e3a8a; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Verify Your Email</h2>
    </div>
    <p>Hello Officer,</p>
    <p>Thank you for signing up for CrimeTrack Police. To verify your email address and complete your registration, click the button below:</p>
    <div style="text-align: center;">
      <a href="%LINK%" class="button">Verify Email Address</a>
    </div>
    <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
    <p style="color: #1e3a8a; word-break: break-all;">%LINK%</p>
    <p>This link will expire in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create this account, please ignore this email.</p>
      <p>&copy; 2026 CrimeTrack Police. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

4. Click **Save**

### 1.4 Add Your Domain to Authorized Domains
1. In **Authentication** > **Settings** tab
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. For development, add:
   - `localhost`
   - `127.0.0.1`
5. For production, add your actual domain (e.g., `myapp.com`)

## Step 2: Update Firebase Verification Handler

Your app now needs to handle the verification callback. Update `src/LoginView.jsx`:

### 2.1 Add URL Parameter Handler

Add this at the top of your `LoginView` component:

```javascript
// Check if user is verifying email via callback link
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const oobCode = params.get('oobCode');
  const mode = params.get('mode');
  
  if (mode === 'verifyEmail' && oobCode) {
    handleEmailVerificationCallback(oobCode);
  }
}, []);

const handleEmailVerificationCallback = async (oobCode) => {
  try {
    setLoading(true);
    await applyActionCode(auth, oobCode);
    setError('Email verified successfully! You can now log in.');
    // Redirect to login after 2 seconds
    setTimeout(() => {
      setIsLogin(true);
      setVerifyStep(false);
      setVerifyUser(null);
    }, 2000);
  } catch (err) {
    setError('Invalid or expired verification link: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

### 2.2 Update Firebase imports
```javascript
import { 
  // ... existing imports
  applyActionCode 
} from 'firebase/auth';
```

## Step 3: Testing Email Verification Locally

### 3.1 Use Firebase Emulator (Recommended)
Firebase Emulator shows emails in the browser instead of sending real emails:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize emulator
firebase init emulator

# Start emulator
firebase emulators:start
```

### 3.2 Use Gmail Test Account
1. Create a test Gmail account
2. Use "Less secure app access" (not recommended for production)
3. Or use **Gmail App Passwords** (recommended):
   - Enable 2FA on your Gmail
   - Generate App Password for "Mail"
   - Use that password in Firebase SMTP settings

## Step 4: For Production Deployment

### Option A: Use Firebase Default (Free)
- Firebase sends emails automatically
- From: `noreply@YOUR_PROJECT.firebaseapp.com`
- Limited to 500 emails/day (free tier)

### Option B: Use Custom Email Provider

If you need higher volume, configure SMTP in Firebase:

1. Go to **Authentication** > **Settings** > **SMTP settings**
2. Set up with:
   - **Gmail:** App password method
   - **SendGrid:** API key
   - **Mailgun:** API credentials
   - **Custom SMTP:** Your email server

## Step 5: Troubleshooting

### Emails not arriving
- ✅ Check **Spam/Junk folder**
- ✅ Verify domain is in **Authorized domains** list
- ✅ Check Firebase **email templates** are configured
- ✅ Check browser console for errors
- ✅ Try **Resend verification email** button

### Link not working
- ✅ Link expires in 24 hours
- ✅ User must click link within 24 hours
- ✅ Domain must match **Authorized domains**

### Rate limiting
Firebase rate-limits verification emails to prevent abuse:
- Max 5 emails per 30 minutes per user
- Wait 30 seconds between resends

## Step 6: User Flow

1. User signs up with email/password or Google
2. App shows "Verify your email" screen
3. Firebase sends verification email
4. User clicks link in email
5. User clicks "I've verified my email" button in app
6. App checks if email is verified
7. User gains full access

## Complete Working Example

```javascript
const triggerEmailVerification = async (user, profile) => {
  try {
    if (!user.emailVerified) {
      await sendEmailVerification(user, {
        url: `${window.location.origin}?email_verified=true`
      });
      console.log('Verification email sent to:', user.email);
    }
  } catch (err) {
    console.error('sendEmailVerification error:', err);
    // Still show verify screen even if email sending fails
    // User can manually verify via link
  }
  setVerifyUser(user);
  setVerifyProfile(profile);
  setVerifyStep(true);
  setLoading(false);
};

const handleCheckVerification = async () => {
  if (!verifyUser) return;
  setLoading(true);
  setError('');
  try {
    // Refresh user data from Firebase
    await verifyUser.reload();
    
    if (verifyUser.emailVerified) {
      // Email is verified, proceed
      saveProfileLocally(verifyProfile);
      onLoginSuccess(verifyUser, verifyProfile);
    } else {
      setError('Email not verified yet. Please click the link in your inbox and come back.');
    }
  } catch (err) {
    setError('Error checking verification: ' + err.message);
  } finally {
    setLoading(false);
  }
};
```

## Next Steps

1. **Set up email template** in Firebase Console (Step 1)
2. **Add authorized domains** (Step 1.4)
3. **Test locally** with your test email (Step 3)
4. **Deploy** and test with production email

If emails still don't arrive after these steps, check your email's spam folder or contact Firebase Support.
