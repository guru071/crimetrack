/**
 * CrimeTrack - Image Upload Web App (YOUR GMAIL)
 *
 * SETUP:
 * 1. Go to script.google.com and click "New Project"
 * 2. Paste this entire file into Code.gs
 * 3. Deploy > New deployment > Web app
 * 4. Execute as: Me | Who has access: Anyone
 * 5. Copy the Web App URL and provide it to the AI.
 */

var DEFAULT_PROFILE_FOLDER_ID = '1KxrdQhObWEvPFQvzk4rZexFYabIKo77l';

function doPost(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(25000);
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = String(body.action || (e.parameter && e.parameter.action) || '').toLowerCase();

    if (action === 'upload_image') {
      return jsonResponse(handleImageUpload_(body.payload || {}));
    }

    // Since this script is ONLY for image uploads, reject anything else.
    return jsonResponse({ status: 'error', message: 'This endpoint only handles image uploads.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Enable CORS preflight for the browser
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleImageUpload_(payload) {
  if (!payload.base64) return { status: 'error', message: 'Missing base64 image' };
  
  var parts = String(payload.base64).split(',');
  var meta = parts[0] || '';
  var data = parts.length > 1 ? parts[1] : parts[0];
  var mime = 'image/jpeg';
  
  var match = meta.match(/data:(.*?);base64/);
  if (match && match[1]) mime = match[1];

  var bytes = Utilities.base64Decode(data);
  var fileName = payload.filename || ('crimetrack_profile_' + Date.now() + '.jpg');
  var blob = Utilities.newBlob(bytes, mime, fileName);
  
  var folderId = payload.folderId || DEFAULT_PROFILE_FOLDER_ID;
  var folder = DriveApp.getFolderById(folderId);
  
  var file = folder.createFile(blob);
  
  // Make the file publicly viewable so the app can display it
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    status: 'success',
    id: file.getId(),
    url: file.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?id=' + file.getId()
  };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
