/**
 * CrimeTrack — Google Apps Script (NO Google Cloud API / API key needed)
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this entire file, Save
 * 4. Deploy → New deployment → Web app
 * 5. Execute as: Me | Who has access: Anyone
 * 6. Copy the Web App URL into CrimeTrack Settings
 */

var HEADERS = [
  'Photo', 'ID', 'Name', 'Father Name', 'Address', 'Age', 'Sex', 'Community & Religion',
  'Police Station', 'HS No.', 'FIR Number', 'FIR Date', 'Cases Pending', 'Current Doings',
  'Hideouts', 'Area of Operation', 'Gang Leader', 'Associates', 'Status', 'Case Year', 'Notes', 'Created At'
];

var KEYS = [
  'photo', 'id', 'name', 'fatherName', 'address', 'age', 'sex', 'communityReligion',
  'policeStation', 'hsNo', 'firNumber', 'firDate', 'casesPending', 'currentDoings',
  'hideouts', 'areaOfOperation', 'gangLeader', 'associates', 'status', 'caseYear', 'notes', 'createdAt'
];

function doGet(e) {
  return jsonResponse(handleRead_());
}

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = (body.action || (e.parameter && e.parameter.action) || 'read').toLowerCase();

    if (action === 'read') {
      return jsonResponse(handleRead_());
    }
    if (action === 'write' && body.records) {
      return jsonResponse(handleWrite_(body.records));
    }
    return jsonResponse({ status: 'error', message: 'Unknown action. Use read or write.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  }
}

function handleRead_() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { status: 'success', records: [], count: 0 };
  }
  var records = [];
  for (var r = 1; r < data.length; r++) {
    var rec = rowToRecord_(data[r]);
    if (rec.name || rec.id) records.push(rec);
  }
  return { status: 'success', records: records, count: records.length };
}

function handleWrite_(records) {
  var sheet = getSheet_();
  sheet.clear();
  ensureHeaders_(sheet);
  var rows = [HEADERS];
  for (var i = 0; i < records.length; i++) {
    rows.push(recordToRow_(records[i]));
  }
  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return { status: 'success', message: 'Saved ' + records.length + ' records', count: records.length };
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Sheet1');
  return sheet || ss.getActiveSheet();
}

function ensureHeaders_(sheet) {
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (String(first[0]) !== 'Photo') {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
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
    if (k === 'photo' && v && String(v).length > 49000) {
      v = String(v).substring(0, 49000);
    }
    row.push(v != null ? v : '');
  }
  return row;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
