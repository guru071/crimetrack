# 🔧 Troubleshooting Guide

## npm install Errors

### Error: "404 Not Found" for google-signin
**Solution**: ✅ Already fixed in package.json
- We changed from `@capacitor-community/google-signin@8.0.1` (doesn't exist)
- To `@capacitor-google-auth/google-auth@3.4.0` (correct package)
- Just run: `npm install` again

### Error: "Unterminated regular expression"
**Status**: Vite transpiler error (usually self-healing)
- Try: Stop dev server and run `npm run dev` again
- Or: Clear cache: `rm -r node_modules/.vite`

---

## keytool / SHA-1 Issues

### Error: "keytool: The term 'keytool' is not recognized"
**Solution**: Use the automated script
```bash
npm run get-sha1
```

This script:
- ✓ Finds keytool automatically (in Java or Android Studio)
- ✓ Reads your debug keystore
- ✓ Extracts SHA-1 fingerprint
- ✓ Shows Firebase setup instructions

### If `npm run get-sha1` still fails:
**Check if Java is installed**:
```bash
java -version
```

**If Java not found**, install it:
1. Download Java from: https://www.oracle.com/java/technologies/downloads/
2. Or install via Android Studio (includes Java)
3. Then set JAVA_HOME environment variable:
   - Add to System Environment Variables:
   - Name: `JAVA_HOME`
   - Value: `C:\Program Files\Java\jdk-21` (or your Java path)

---

## Firebase & Google Issues

### Email not sending from EmailJS
**Check**:
1. EmailJS credentials in `src/emailService.js` are correct
   - PUBLIC_KEY: `2CW5CA4TAdcAs0lFK`
   - SERVICE_ID: `service_ih1ohr8`
   - TEMPLATE_ID: `template_pbwt85x`

2. Check browser console for errors:
   - Open DevTools (F12)
   - Look for "EmailJS" errors
   - Check network tab for failed requests

3. Verify Gmail account is connected in EmailJS dashboard:
   - https://dashboard.emailjs.com → Email Services
   - Gmail service should be "Connected"

### Google Sign-In popup not showing
**Check**:
1. Popup blockers - allow popups for localhost:5174
2. Browser console for errors - look for "Google" errors
3. Firebase SDK initialized - check console for "Firebase initialized"

### Google Sign-In on APK not working
**Check**:
1. Web Client ID is correct in `src/nativeGoogleSignIn.js` (line 27)
2. SHA-1 fingerprint added to Firebase Console
3. Google Play Services installed on device

---

## Development Server Issues

### Port 5174 already in use
**Solution**: Vite will auto-fallback to next port
- Check the console output for actual port
- Or kill the process using port 5174:
```bash
# Windows
netstat -ano | findstr :5174
taskkill /PID <PID> /F
```

### Vite dev server not starting
**Solutions**:
1. Clear cache:
```bash
rm -r node_modules/.vite dist
npm run dev
```

2. Check for syntax errors:
```bash
npm run lint
```

3. Rebuild from scratch:
```bash
rm -r node_modules
npm install
npm run dev
```

---

## Email Verification Issues

### "Verification email not received"
**Check**:
1. Check spam/junk folder
2. Wait 1-2 minutes (EmailJS may be slow)
3. Click "Resend Verification Email" button
4. Check browser console for send errors

### "Verification link expired"
**Solution**: Links expire in 24 hours
- User must click "Resend Verification Email"
- Or sign up again with new email

### Verification link not working
**Check**:
1. URL in email should be: `http://localhost:5174?oobCode=...`
2. Click it in same browser where you signed up
3. Should see "Email verified successfully!"

---

## APK Build Issues

### "Capacitor update not needed"
**Solution**: This is normal
- Run: `npx cap sync android`
- Then: `npx cap build android`

### APK build fails
**Check**:
1. Gradle installed: `gradle --version`
2. Android SDK installed
3. Build tools updated:
   - Open Android Studio
   - SDK Manager → Install latest build-tools

### APK won't install on device
**Solutions**:
1. Uninstall previous: `adb uninstall com.police.case`
2. Clear cache: `adb shell pm clear com.police.case`
3. Retry: `adb install app-debug.apk`

---

## Browser Console Errors

### "Transform failed" / "Unterminated regular expression"
**Solution**: Syntax error in code
- Fix the error mentioned in error message
- Dev server auto-reloads

### "Firebase is not configured"
**Solution**: Firebase credentials missing
- Check `src/firebase.js` has all keys
- Check VITE_FIREBASE_* environment variables

### "[object Object]" errors
**Check**:
1. Look for actual error in console
2. Expand the error to see full details
3. Search for key text in code

---

## Performance Issues

### App slow on localhost
**Causes**:
- Large data set in localStorage
- Too many re-renders
- Browser DevTools open (slows React)

**Solutions**:
1. Close DevTools (F12)
2. Clear localStorage: `localStorage.clear()`
3. Hard refresh: `Ctrl+Shift+R`

### APK running slowly
**Causes**:
- Debug APK (slower than release)
- Device has low RAM
- Too many background processes

**Solutions**:
1. Build release APK: `npx cap build android --prod`
2. Close background apps
3. Restart device

---

## Still Stuck?

### Collect Debug Info:
```bash
# Show npm version
npm -v

# Show Node version
node -v

# Show npm packages
npm list

# Show errors in detail
npm run dev 2>&1 | head -50
```

### Common Commands:
```bash
# Clean reinstall
npm ci

# Check for issues
npm audit

# See what would be installed
npm install --dry-run

# Verbose output
npm install --verbose
```

### Get Help:
- **Firebase**: https://firebase.google.com/docs/auth
- **EmailJS**: https://www.emailjs.com/docs
- **Capacitor**: https://capacitorjs.com/docs
- **Vite**: https://vitejs.dev/guide/

---

**Last Updated**: 2025-05-24  
**App Version**: 1.0
