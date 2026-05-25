import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const root = process.cwd();
const checks = [];

function add(name, ok, details = '') {
  checks.push({ name, ok, details });
  const status = ok ? 'OK' : 'FIX';
  console.log(`[${status}] ${name}${details ? ` - ${details}` : ''}`);
}

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function isPlaceholder(value) {
  return !value || /your_|placeholder|here/i.test(value);
}

async function readJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function checkFirebase() {
  const apiKey = env('VITE_FIREBASE_API_KEY', 'AIzaSyDAniQjUFjHmrra6TkoJno4JqvpSC_8ews');
  const authDomain = env('VITE_FIREBASE_AUTH_DOMAIN', 'case-3791e.firebaseapp.com');
  const projectId = env('VITE_FIREBASE_PROJECT_ID', 'case-3791e');
  const databaseId = env('VITE_FIREBASE_DATABASE_ID', 'case');

  const firebaseEnvOk = ![apiKey, authDomain, projectId].some(isPlaceholder);
  add('Firebase env values', firebaseEnvOk, firebaseEnvOk ? 'configured in .env or source fallback' : 'paste VITE_FIREBASE_* values in .env');

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const json = await readJsonResponse(res);
    add('Firebase Auth API key', json.error?.message === 'MISSING_ID_TOKEN', json.error?.message || `HTTP ${res.status}`);
  } catch (error) {
    add('Firebase Auth API key', false, error.message);
  }

  try {
    const res = await fetch(`https://${authDomain}/__/auth/handler`, { redirect: 'manual' });
    add('Firebase Auth domain', res.status < 500, `HTTP ${res.status}`);
  } catch (error) {
    add('Firebase Auth domain', false, error.message);
  }

  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?pageSize=1&key=${apiKey}`);
    const json = await readJsonResponse(res);
    const ok = res.status === 200 || res.status === 403;
    add('Firebase Firestore database', ok, ok ? `HTTP ${res.status}` : `${json.error?.message || `HTTP ${res.status}`} | Fix: Firebase Console > Firestore Database > Create database`);
  } catch (error) {
    add('Firebase Firestore database', false, error.message);
  }

  add('Firebase Storage bucket', true, 'not required: profile photos are compressed into the officer Firestore profile');
}

async function checkDriveFolder() {
  const folderId = env('VITE_GOOGLE_DRIVE_FOLDER_ID', '1KxrdQhObWEvPFQvzk4rZexFYabIKo77l');
  add('Google Drive folder ID', !isPlaceholder(folderId), folderId);
  try {
    const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`);
    add('Google Drive folder link', res.status < 500, `HTTP ${res.status}`);
  } catch (error) {
    add('Google Drive folder link', false, error.message);
  }
}

function checkNativeProject() {
  const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const manifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.USE_BIOMETRIC',
    'android.speech.RecognitionService'
  ];

  for (const permission of requiredPermissions) {
    add(`Android manifest ${permission}`, manifest.includes(permission));
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const requiredDeps = [
    'firebase',
    '@capacitor-community/speech-recognition',
    '@capacitor/local-notifications',
    '@capgo/capacitor-native-biometric',
    '@capacitor/android',
    'electron'
  ];
  for (const dep of requiredDeps) {
    add(`Dependency ${dep}`, Boolean(deps[dep]), deps[dep] || 'missing');
  }
}

await checkFirebase();
await checkDriveFolder();
checkNativeProject();

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\n${failed.length} API/setup check(s) need attention.`);
  process.exitCode = 1;
} else {
  console.log('\nAll checked APIs/configuration points look ready.');
}
