/**
 * CrimeTrack - Google Apps Script Web App
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this entire file and save
 * 4. Deploy > New deployment > Web app
 * 5. Execute as: Me | Who has access: Anyone
 * 6. Copy the Web App URL into CrimeTrack Settings
 */

var RECORD_SHEET = 'Sheet1';
var LOG_SHEET = 'AuditLogs';
var DEFAULT_PROFILE_FOLDER_ID = '1KxrdQhObWEvPFQvzk4rZexFYabIKo77l';

var HEADERS = [
  'Photo', 'ID', 'Name', 'Father Name', 'Address', 'Age', 'Sex', 'Community & Religion',
  'Family Members', 'Properties Details', 'Police Station', 'HS No.', 'FIR Number', 'FIR Date',
  'Session Number', 'Cases Pending', 'Current Doings', 'Hideouts', 'Area of Operation',
  'Gang Leader', 'Associates', 'Status', 'Case Year', 'Notes', 'Created At', 'Updated At'
];

var KEYS = [
  'photo', 'id', 'name', 'fatherName', 'address', 'age', 'sex', 'communityReligion',
  'familyMembers', 'propertiesDetails', 'policeStation', 'hsNo', 'firNumber', 'firDate',
  'sessionNumber', 'casesPending', 'currentDoings', 'hideouts', 'areaOfOperation',
  'gangLeader', 'associates', 'status', 'caseYear', 'notes', 'createdAt', 'updatedAt'
];

var LOG_HEADERS = ['Timestamp', 'Officer ID', 'Officer Name', 'Station', 'Event', 'Details'];

function doGet() {
  return jsonResponse(handleRead_());
}

function doPost(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(25000);
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = String(body.action || (e.parameter && e.parameter.action) || 'read').toLowerCase();

    if (action === 'read') return jsonResponse(handleRead_());
    if (action === 'write' && body.records) return jsonResponse(handleWrite_(body.records));
    if (action === 'log') return jsonResponse(handleLog_(body.payload || {}));
    if (action === 'read_logs') return jsonResponse(handleReadLogs_());
    if (action === 'upload_image') return jsonResponse(handleImageUpload_(body.payload || {}));

    return jsonResponse({ status: 'error', message: 'Unknown action.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function handleRead_() {
  var sheet = getRecordSheet_();
  ensureHeaders_(sheet);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: 'success', records: [], count: 0 };

  var records = [];
  for (var r = 1; r < data.length; r++) {
    var rec = rowToRecord_(data[r]);
    if (rec.name || rec.id) records.push(rec);
  }
  return { status: 'success', records: records, count: records.length };
}

function handleWrite_(records) {
  var sheet = getRecordSheet_();
  sheet.clear();
  ensureHeaders_(sheet);

  var rows = [HEADERS];
  for (var i = 0; i < records.length; i++) rows.push(recordToRow_(records[i]));
  if (rows.length > 1) sheet.getRange(1, 1, rows.length, HEADERS.length).setValues(rows);

  return { status: 'success', message: 'Saved ' + records.length + ' records', count: records.length };
}

function handleLog_(payload) {
  var sheet = getLogSheet_();
  ensureLogHeaders_(sheet);
  var row = [
    payload.timestamp || new Date().toISOString(),
    payload.officerId || '',
    payload.officerName || '',
    payload.station || '',
    payload.event || '',
    payload.details || '',
    payload.officerPhoto || ''
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Log saved' };
}

function handleReadLogs_() {
  var sheet = getLogSheet_();
  ensureLogHeaders_(sheet);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: 'success', logs: [] };

  var logs = [];
  for (var r = 1; r < data.length; r++) {
    logs.push({
      timestamp: data[r][0] || '',
      officerId: data[r][1] || '',
      officerName: data[r][2] || '',
      station: data[r][3] || '',
      event: data[r][4] || '',
      details: data[r][5] || '',
      officerPhoto: data[r][6] || ''
    });
  }
  return { status: 'success', logs: logs.reverse().slice(0, 50) };
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
  var fileName = payload.filename || ('crimetrack_' + Date.now() + '.jpg');
  var blob = Utilities.newBlob(bytes, mime, fileName);
  var folderId = payload.folderId || DEFAULT_PROFILE_FOLDER_ID;
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    status: 'success',
    id: file.getId(),
    url: file.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?id=' + file.getId()
  };
}

function getRecordSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RECORD_SHEET);
  return sheet || ss.getActiveSheet();
}

function getLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LOG_SHEET);
  return sheet || ss.insertSheet(LOG_SHEET);
}

function ensureHeaders_(sheet) {
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (String(first[0]) !== 'Photo' || String(first[HEADERS.length - 1]) !== 'Updated At') {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
  }
}

function ensureLogHeaders_(sheet) {
  var first = sheet.getRange(1, 1, 1, LOG_HEADERS.length).getValues()[0];
  if (String(first[0]) !== 'Timestamp') {
    sheet.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function rowToRecord_(row) {
  var rec = {};
  for (var i = 0; i < KEYS.length; i++) {
    var v = row[i];
    rec[KEYS[i]] = v != null && v !== '' ? String(v) : '';
  }
  return rec;
}

function recordToRow_(rec) {
  var row = [];
  for (var i = 0; i < KEYS.length; i++) {
    var k = KEYS[i];
    var v = rec[k];
    if (k === 'photo' && v && String(v).length > 49000) v = String(v).substring(0, 49000);
    row.push(v != null ? v : '');
  }
  return row;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
