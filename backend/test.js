import dotenv from 'dotenv';
import GoogleSheetsHandler from './google-sheets-handler.js';

dotenv.config();

function isPlaceholder(value) {
  return !value || /your_|placeholder|replace_me|here/i.test(value);
}

const env = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
};

let configured = true;
for (const [key, value] of Object.entries(env)) {
  if (isPlaceholder(value)) {
    console.log(`[WARN] ${key} is not configured`);
    configured = false;
  } else {
    console.log(`[OK] ${key} configured`);
  }
}

if (!configured) {
  console.log('\nGoogle OAuth backend is optional. Fill these values only if you want the Node OAuth backend.');
  console.log('The frontend Apps Script sync path can still work without backend OAuth credentials.');
  process.exit(0);
}

const handler = new GoogleSheetsHandler(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

console.log(`[OK] Handler initialized`);
console.log(`[OK] OAuth authenticated: ${handler.isAuthenticated()}`);
console.log(`[OK] Auth URL generation: ${handler.getAuthorizationUrl().startsWith('https://accounts.google.com/')}`);
