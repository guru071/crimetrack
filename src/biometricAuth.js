import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export async function isBiometricAvailable() {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    const available = await NativeBiometric.isAvailable();
    return available.isAvailable;
  } catch (err) {
    console.warn('Biometric not available:', err);
    return false;
  }
}

export async function authenticateWithBiometric(reason = 'Authenticate to access the app') {
  try {
    if (!Capacitor.isNativePlatform()) return true;

    const available = await isBiometricAvailable();
    if (!available) return true;

    await NativeBiometric.performBiometricAuthentication({
      reason
    });
    return true;
  } catch (err) {
    console.error('Biometric authentication failed:', err);
    return false;
  }
}

export async function getAvailableBiometryType() {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const info = await NativeBiometric.isAvailable();
    return info.biometryType || null;
  } catch (err) {
    return null;
  }
}
