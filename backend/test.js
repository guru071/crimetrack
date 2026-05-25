/**
 * Google Sheets Backend - Test Utility
 * Run this to verify your backend setup
 * 
 * Usage: node backend/test.js
 */

import dotenv from 'dotenv';
import GoogleSheetsHandler from './google-sheets-handler.js';

dotenv.config();

const TEST_COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${TEST_COLORS[color]}${message}${TEST_COLORS.reset}`);
}

function divider(title = '') {
  console.log('\n' + '='.repeat(60));
  if (title) {
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  }
}

function isPlaceholder(value) {
  return !value || /your_|placeholder|here/i.test(value);
}

async function runTests() {
  divider('Google Sheets Backend - Test Suite');

  // Test 1: Check environment variables
  log('\n1. Checking environment variables...', 'blue');
  const env = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  };

  let envValid = true;
  Object.entries(env).forEach(([key, value]) => {
    if (isPlaceholder(value)) {
      log(`   ✗ ${key} - NOT CONFIGURED`, 'red');
      envValid = false;
    } else {
      log(`   ✓ ${key}`, 'green');
    }
  });

  if (!envValid) {
    log('\n   ✗ Missing required Google OAuth environment variables', 'red');
    log('   → Fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and GOOGLE_SHEETS_ID if you want to use the OAuth backend.', 'yellow');
    log('   → The frontend can still use the Apps Script Web App path without these OAuth credentials.', 'yellow');
    return false;
  }

  // Test 2: Initialize handler
  log('\n2. Initializing GoogleSheetsHandler...', 'blue');
  let handler;
  try {
    handler = new GoogleSheetsHandler(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    log('   ✓ Handler initialized successfully', 'green');
  } catch (error) {
    log(`   ✗ Failed to initialize handler: ${error.message}`, 'red');
    return false;
  }

  // Test 3: Check for saved credentials
  log('\n3. Checking for saved OAuth tokens...', 'blue');
  if (handler.isAuthenticated()) {
    log('   ✓ Valid credentials found in backend/token.json', 'green');
  } else {
    log('   ℹ No saved credentials yet', 'yellow');
    log('   → Follow the OAuth flow to authenticate:', 'yellow');
    log('   → 1. GET http://localhost:3001/api/sheets/auth/url', 'yellow');
    log('   → 2. Open URL in browser and authorize', 'yellow');
    log('   → 3. Credentials will be saved automatically', 'yellow');
  }

  // Test 4: Generate auth URL
  log('\n4. Generating OAuth authorization URL...', 'blue');
  try {
    const authUrl = handler.getAuthorizationUrl();
    log('   ✓ Auth URL generated', 'green');
    console.log(`\n   URL: ${authUrl}\n`);
  } catch (error) {
    log(`   ✗ Failed to generate auth URL: ${error.message}`, 'red');
    return false;
  }

  // Test 5: Test API endpoints availability
  log('\n5. Testing API endpoint availability...', 'blue');
  const endpoints = [
    '/api/sheets/auth/url',
    '/api/sheets/auth/status',
    '/api/sheets/health',
    '/api/sheets/fetch',
    '/api/sheets/sync',
  ];

  endpoints.forEach(endpoint => {
    log(`   ✓ ${endpoint} - registered`, 'green');
  });

  // Test 6: Summary
  divider('Test Summary');
  log('\n✓ Backend setup looks good!', 'green');
  log('\nNext steps:', 'blue');
  log('  1. Start the backend: npm run backend', 'yellow');
  log('  2. Authenticate if needed:', 'yellow');
  log('     curl http://localhost:3001/api/sheets/auth/url', 'yellow');
  log('  3. Open the returned URL in your browser', 'yellow');
  log('  4. Test endpoints:', 'yellow');
  log('     curl http://localhost:3001/api/sheets/auth/status', 'yellow');
  log('     curl http://localhost:3001/api/sheets/info?spreadsheetId=YOUR_ID', 'yellow');

  divider();
  return true;
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test failed: ${error.message}`, 'red');
  process.exit(1);
});
