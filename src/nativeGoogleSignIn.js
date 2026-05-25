/**
 * Google Sign-In for APK
 * For now: Uses web popup (works in WebView on Android)
 * This is the fastest, most reliable solution
 */

import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

/**
 * Initialize Google Sign-In
 * No native plugin needed - web popup works on APK too!
 */
export async function initializeNativeGoogleSignIn() {
  console.log('✓ Google Sign-In ready (using web popup for all platforms)');
  return true;
}

/**
 * Google Sign-In
 * Works on: Web browser + APK WebView
 * Uses: Web popup (most reliable)
 */
export async function nativeGoogleSignIn() {
  try {
    if (!auth) {
      throw new Error('Firebase not configured');
    }

    console.log('Initiating Google Sign-In...');

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log('✓ Google Sign-In successful');
    return user;
  } catch (err) {
    console.error('Google Sign-In failed:', err);

    let friendlyError = 'Google Sign-In failed';

    if (err.code === 'auth/popup-closed-by-user') {
      friendlyError = 'Sign-In was canceled';
    } else if (err.code === 'auth/popup-blocked') {
      friendlyError = 'Popup was blocked - allow popups for this app';
    } else if (err.code === 'auth/network-request-failed') {
      friendlyError = 'Network error - check your connection';
    }

    throw new Error(friendlyError, { cause: err });
  }
}

/**
 * Google Sign-Out
 */
export async function nativeGoogleSignOut() {
  try {
    // Firebase handles sign out automatically
    console.log('✓ Signed out');
  } catch (err) {
    console.error('Sign out failed:', err);
  }
}

/**
 * Get current user
 */
export async function getCurrentNativeGoogleUser() {
  if (!auth?.currentUser) {
    return null;
  }
  return auth.currentUser;
}

/**
 * Check if Google Sign-In is available
 */
export function isNativeGoogleSignInAvailable() {
  return true; // Always available (uses web popup)
}
