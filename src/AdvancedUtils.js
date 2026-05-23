// Encryption utility for sensitive fields
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = "crimetrack-e2e-encryption-key";

export const encryptField = (value) => {
  if (!value) return '';
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
  } catch (e) {
    console.error('Encryption failed:', e);
    return value;
  }
};

export const decryptField = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error('Decryption failed:', e);
    return ciphertext;
  }
};

// Image compression utility
export const compressImage = async (base64Str, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 500;
      const MAX_HEIGHT = 500;
      let width = img.width, height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) { height = Math.round(height * MAX_WIDTH / width); width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width = Math.round(width * MAX_HEIGHT / height); height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

// Audit logger
export const auditLog = (action, details, recordId) => {
  try {
    const log = {
      timestamp: new Date().toISOString(),
      action,
      details,
      recordId,
      userId: localStorage.getItem('crimetrack_user_id') || 'anonymous'
    };

    const logs = JSON.parse(localStorage.getItem('crimetrack_audit_logs') || '[]');
    logs.push(log);

    // Keep only last 1000 logs
    if (logs.length > 1000) logs.shift();

    localStorage.setItem('crimetrack_audit_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Audit log failed:', e);
  }
};

// Risk scoring algorithm
export const calculateRiskScore = (record) => {
  let score = 0;

  if (record.status === 'Active') score += 40;
  if (record.status === 'Absconding') score += 50;
  if (record.casesPending) score += record.casesPending.split(',').length * 10;
  if (record.gangLeader) score += 30;
  if (record.associates && record.associates.split('\n').length > 2) score += 20;

  // Normalize to 0-100
  return Math.min(score, 100);
};

// Hotspot analysis
export const getHotspots = (records) => {
  const hotspots = {};
  records.forEach(r => {
    if (r.areaOfOperation) {
      const area = r.areaOfOperation.split(',')[0].trim();
      hotspots[area] = (hotspots[area] || 0) + 1;
    }
  });
  return Object.entries(hotspots)
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count, risk: Math.min(count * 10, 100) }));
};
