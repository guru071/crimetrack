import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'backend', 'service-account.json');

let driveService = null;

function getDriveService() {
  if (!driveService) {
    if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_FILE}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    driveService = google.drive({ version: 'v3', auth });
  }
  return driveService;
}

export async function uploadImageToDriveUsingServiceAccount(filePath, fileName, mimeType, folderId) {
  try {
    const drive = getDriveService();
    
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };
    
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file readable by anyone with the link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      status: 'success',
      id: response.data.id,
      url: response.data.webViewLink,
      downloadUrl: response.data.webContentLink,
    };
  } catch (error) {
    console.error('Error uploading to Drive via Service Account:', error);
    if (error?.message?.includes('storage quota')) {
      throw new Error('Google Drive rejected the service account upload because service accounts do not have personal Drive storage quota. Use the Apps Script Drive upload endpoint, OAuth user upload, or a Shared Drive with delegated access.', { cause: error });
    }
    throw error;
  }
}
