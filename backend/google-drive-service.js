import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'backend', 'service-account.json');

let driveService = null;

function getDriveService() {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error(`Service account file not found at ${SERVICE_ACCOUNT_FILE}. Use Apps Script uploads, OAuth uploads, or add the service account JSON file.`);
  }

  if (!driveService) {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    driveService = google.drive({ version: 'v3', auth });
  }

  return driveService;
}

export async function uploadImageToDriveUsingServiceAccount(filePath, fileName, mimeType, folderId) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Upload source file not found: ${filePath}`);
    }

    const drive = getDriveService();
    const response = await drive.files.create({
      resource: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType,
        body: fs.createReadStream(filePath),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return {
      success: true,
      status: 'success',
      fileId: response.data.id,
      id: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      shareableLink: response.data.webViewLink,
    };
  } catch (error) {
    if (error?.message?.toLowerCase().includes('storage quota')) {
      throw new Error(
        'Google Drive rejected the service-account upload because service accounts do not have personal Drive quota. Use the Apps Script Drive upload endpoint, OAuth user upload, or a Shared Drive with delegated access.',
        { cause: error }
      );
    }
    throw error;
  }
}
