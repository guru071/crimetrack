import CryptoJS from "crypto-js";

export function encryptRecord(record, e2eKey) {
  if (!e2eKey) return record; // No encryption
  try {
    const jsonStr = JSON.stringify(record);
    const encrypted = CryptoJS.AES.encrypt(jsonStr, e2eKey).toString();
    return {
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt || new Date().toISOString(),
      encryptedData: encrypted,
    };
  } catch (err) {
    console.error("Encryption failed for record", record.id, err);
    return record; // Fallback to unencrypted if it fails
  }
}

export function decryptRecord(record, e2eKey) {
  if (!e2eKey || !record.encryptedData) return record; // Not encrypted or no key
  try {
    const bytes = CryptoJS.AES.decrypt(record.encryptedData, e2eKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) throw new Error("Bad password or corrupted data");
    const decryptedObj = JSON.parse(decryptedString);

    // Merge back id and dates just in case
    return {
      ...decryptedObj,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  } catch (err) {
    console.error("Decryption failed for record", record.id);
    // Return a dummy record so it doesn't crash the UI
    return {
      id: record.id,
      name: " ENCRYPTED RECORD",
      notes: "Decryption failed. Incorrect End-to-End Encryption Key?",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      _decryptionFailed: true,
    };
  }
}
