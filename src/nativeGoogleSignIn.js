/**
 * Google Sign-In for APK
 *
 * HOW IT WORKS:
 *  - Android WebView normally contains " wv" in its User-Agent string.
 *  - Google detects this and blocks OAuth ("Unable to process request").
 *  - MainActivity.java removes " wv" from the UA, making Google treat
 *    the WebView as a regular Chrome browser.
 *  - So signInWithPopup() works directly  no Chrome Custom Tab redirect needed.
 *
 * Both Android (APK) and Web use signInWithPopup().
 * signInWithRedirect is NOT used  it causes redirect-to-localhost issues in Capacitor.
 */

import { auth } from './firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export async function initializeNativeGoogleSignIn() {
  console.log(' Google Sign-In ready');
  return true;
}

export async function nativeGoogleSignIn() {
  if (!auth) throw new Error('Firebase not configured');

  if (Capacitor.isNativePlatform()) {
    // Native Android/iOS: Use native plugin to avoid opening Chrome
    const result = await FirebaseAuthentication.signInWithGoogle({
      clientId: "351985375859-583jekuhsl2cvb9d7lvsbg7dh7c15ebk.apps.googleusercontent.com"
    });
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } else {
    // Web / Electron: Use standard popup
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }
}

export async function checkGoogleRedirectResult() {
  // We use native plugin or popup, no redirect
  return null;
}

export function isNativeGoogleSignInAvailable() {
  return true;
}
