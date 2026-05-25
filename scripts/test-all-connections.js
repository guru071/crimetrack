import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'backend', 'service-account.json');
const DRIVE_FOLDER_ID = process.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1KxrdQhObWEvPFQvzk4rZexFYabIKo77l';

async function testAllConnections() {
  console.log('=============================================');
  console.log('LIVE API CONNECTION TEST SUITE');
  console.log('=============================================\n');

  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.error('❌ Service account file missing. Cannot run live tests.');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: [
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  // 1. TEST FIRESTORE "CASE" DATABASE
  console.log('1. Testing Firebase Firestore ("case" database)...');
  try {
    const firestore = google.firestore({ version: 'v1', auth });
    const testDocPath = 'projects/case-3791e/databases/case/documents/test_connection/ping';
    
    await firestore.projects.databases.documents.patch({
      name: testDocPath,
      requestBody: { fields: { timestamp: { stringValue: new Date().toISOString() } } }
    });
    console.log('   ✅ Successfully wrote data to Firestore "case" database.');
  } catch (error) {
    console.error('   ❌ Firestore connection failed:', error.message);
  }

  // 2. TEST GOOGLE DRIVE FOLDER
  console.log('\n2. Testing Google Drive Upload (Folder ID: ' + DRIVE_FOLDER_ID + ')...');
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    // Create a tiny 1-pixel test image in memory
    const tinyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const buffer = Buffer.from(tinyImageBase64, 'base64');
    
    // Write it to a temp file
    const tempFile = path.join(process.cwd(), 'temp-test-image.png');
    fs.writeFileSync(tempFile, buffer);

    const fileMetadata = {
      name: 'test_connection.png',
      parents: [DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: 'image/png',
      body: fs.createReadStream(tempFile),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });
    
    fs.unlinkSync(tempFile);
    
    console.log('   ✅ Successfully uploaded test image to Google Drive!');
    console.log('      File ID: ' + response.data.id);
    console.log('      View Link: ' + response.data.webViewLink);
    
    // Clean up test file
    await drive.files.delete({ fileId: response.data.id });
    console.log('   ✅ Successfully cleaned up test image from Drive.');

  } catch (error) {
    if (error.message.includes('storage quota')) {
      console.warn('   ⚠️ Google Drive service-account upload is not available because service accounts do not have personal Drive storage quota.');
      console.warn('      Use the Apps Script Drive upload endpoint, OAuth user upload, or a Shared Drive/domain delegation setup.');
      console.warn('      The app profile-photo path does not depend on this endpoint; it stores compressed photos in Firestore.');
      return;
    }
    if (error.message.includes('File not found')) {
      console.error('   ❌ Google Drive connection failed: The Service Account does not have Editor access to your Drive folder. You must share the folder with: firebase-adminsdk-fbsvc@case-3791e.iam.gserviceaccount.com');
    } else {
      console.error('   ❌ Google Drive connection failed:', error.message);
    }
  }

  console.log('\n=============================================');
  console.log('TEST COMPLETE');
  console.log('=============================================');
}

testAllConnections();
