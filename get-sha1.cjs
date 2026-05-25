#!/usr/bin/env node

/**
 * Get Android Debug SHA-1 Fingerprint
 * Usage: npm run get-sha1
 * 
 * This reads the debug.keystore from your Android SDK and extracts the SHA-1 fingerprint
 * needed for Google Sign-In on Android APK.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Try to find Java keytool
function findKeytool() {
  // Common Java locations on Windows
  const paths = [
    path.join(process.env.JAVA_HOME || '', 'bin', 'keytool.exe'),
    'C:\\Program Files\\Java\\jdk-21\\bin\\keytool.exe',
    'C:\\Program Files\\Java\\jdk-20\\bin\\keytool.exe',
    'C:\\Program Files\\Java\\jdk-11\\bin\\keytool.exe',
    'C:\\Program Files (x86)\\Java\\jdk-11\\bin\\keytool.exe',
    'C:\\Program Files\\Android\\Android Studio\\jre\\bin\\keytool.exe',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'keytool'; // Hope it's in PATH
}

function getSHA1Fingerprint() {
  try {
    const keystorePath = path.join(os.homedir(), '.android', 'debug.keystore');

    if (!fs.existsSync(keystorePath)) {
      console.error('❌ Debug keystore not found at:', keystorePath);
      console.log('\nTo generate one:');
      console.log('  keytool -genkey -v -keystore ~/.android/debug.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias androiddebugkey');
      process.exit(1);
    }

    const keytool = findKeytool();
    console.log('🔍 Using keytool from:', keytool);
    console.log('📁 Reading keystore from:', keystorePath);
    console.log('');

    const cmd = `"${keytool}" -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android`;

    const output = execSync(cmd, { encoding: 'utf-8' });

    // Extract SHA1 from output
    const sha1Match = output.match(/SHA1[:\s]+([A-F0-9:]+)/i);
    if (sha1Match) {
      const sha1 = sha1Match[1].trim();
      console.log('✅ SHA-1 Fingerprint Found:');
      console.log('');
      console.log('   ' + sha1);
      console.log('');
      console.log('📋 Instructions:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com');
      console.log('2. Select your project');
      console.log('3. Go to: Project Settings → Your apps → Select Android app');
      console.log('4. Scroll to "SHA certificate fingerprints"');
      console.log('5. Click "Add fingerprint"');
      console.log('6. Paste the SHA-1 above');
      console.log('7. Save');
      console.log('');
      console.log('✨ Done! Your APK can now use Google Sign-In.');
    } else {
      console.error('❌ Could not find SHA-1 in keystore output');
      console.log('\nFull output:');
      console.log(output);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('');
    console.log('Make sure:');
    console.log('1. Java is installed');
    console.log('2. Set JAVA_HOME environment variable');
    console.log('3. Or install Android Studio which includes keytool');
    console.log('');
    console.log('Alternative: Generate keystore manually:');
    console.log('  keytool -genkey -v -keystore ~/.android/debug.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias androyddebugkey');
    process.exit(1);
  }
}

getSHA1Fingerprint();
