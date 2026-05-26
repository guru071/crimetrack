#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function findKeytool() {
  const candidates = [
    path.join(process.env.JAVA_HOME || '', 'bin', 'keytool.exe'),
    'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe',
    'C:\\Program Files\\Android\\Android Studio\\jre\\bin\\keytool.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\keytool.exe',
    'C:\\Program Files\\Java\\jdk-17\\bin\\keytool.exe',
    'keytool',
  ];
  return candidates.find(candidate => candidate === 'keytool' || fs.existsSync(candidate)) || 'keytool';
}

const keystorePath = path.join(os.homedir(), '.android', 'debug.keystore');
if (!fs.existsSync(keystorePath)) {
  console.error(`Debug keystore not found: ${keystorePath}`);
  console.error('Open Android Studio once, or generate a debug keystore with keytool.');
  process.exit(1);
}

try {
  const keytool = findKeytool();
  const command = `"${keytool}" -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android`;
  const output = execSync(command, { encoding: 'utf8' });
  const match = output.match(/SHA1:\s*([A-F0-9:]+)/i);
  if (!match) throw new Error('SHA1 fingerprint was not found in keytool output');
  console.log(match[1]);
} catch (error) {
  console.error(`Could not read SHA-1 fingerprint: ${error.message}`);
  process.exit(1);
}
